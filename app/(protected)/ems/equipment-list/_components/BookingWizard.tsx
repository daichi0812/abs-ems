"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { useCachedEndpoint } from "@/hooks/use-cached-endpoint";
import { useMonthNav } from "@/hooks/use-month-nav";
import { useEquipments } from "@/app/(protected)/ems/hooks/use-equipments";
import { useCategories } from "@/app/(protected)/ems/equipment-list/hooks/use-categories";
import { useReserves } from "@/app/(protected)/ems/equipment-list/hooks/use-reserves";
import { useAvailabilityGroups } from "@/app/(protected)/ems/equipment-list/hooks/use-availability-groups";
import { useBookingCart } from "@/app/(protected)/ems/equipment-list/hooks/use-booking-cart";
import { useBookingSubmit } from "@/app/(protected)/ems/equipment-list/hooks/use-booking-submit";

import {
  buildMonthMatrix,
  todayJstDayIndex,
  formatRange,
  dayIndexToDateString,
} from "@/lib/calendar/date-grid";
import type { DayRange } from "@/components/calendar/RangeMiniCalendar";
import { Skeleton } from "@/components/ui/skeleton";

import { PeriodPanel } from "./PeriodPanel";
import { EquipmentPickPanel } from "./EquipmentPickPanel";
import { ConfirmPanel } from "./ConfirmPanel";
import { DoneScreen } from "./DoneScreen";
import { StepIndicator, StepDot } from "./StepIndicator";

interface UserLite {
  id: string;
  name: string;
}

export function BookingWizard() {
  const router = useRouter();
  const { equipments, isLoading: eqLoading } = useEquipments();
  const { categories, isLoading: catLoading } = useCategories();
  const {
    reserves,
    isLoading: reservesLoading,
    isError: reservesError,
    hasLoaded: reservesLoaded,
    refetch: refetchReserves,
  } = useReserves();

  // 部員名の解決用。キャッシュはカレンダー画面の /api/users と共有される
  const { data: users } = useCachedEndpoint<UserLite>("/api/users");

  const todayIdx = todayJstDayIndex();
  const { viewYear, viewMonth0, goPrevMonth, goNextMonth } = useMonthNav();
  const matrix = useMemo(() => buildMonthMatrix(viewYear, viewMonth0), [viewYear, viewMonth0]);

  const [range, setRange] = useState<DayRange>({ startIdx: null, endIdx: null });
  const [step, setStep] = useState<1 | 2 | 3>(1); // モバイルのステップ
  const [done, setDone] = useState(false);
  // 機材が増えても目当てを探せるよう、名前検索と「空きのみ」絞り込みを持つ
  const [query, setQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);

  const rangeOk = range.startIdx != null && range.endIdx != null;
  const startStr = range.startIdx != null ? dayIndexToDateString(range.startIdx) : "";
  const endStr = range.endIdx != null ? dayIndexToDateString(range.endIdx) : "";
  const rangeText = rangeOk ? formatRange(range.startIdx!, range.endIdx!) : "";
  const days = rangeOk ? range.endIdx! - range.startIdx! + 1 : 0;

  const equipmentName = (id: number) => equipments.find((e) => e.id === id)?.name ?? `#${id}`;

  const { cart, setCart, toggle, pruneForRange } = useBookingCart({ reserves, equipmentName });

  const { groups, visibleGroups, cartItems } = useAvailabilityGroups({
    equipments,
    categories,
    catLoading,
    reserves,
    users,
    range,
    rangeOk,
    cart,
    query,
    freeOnly,
  });

  const { isSubmitting, handleSubmit } = useBookingSubmit({
    cart,
    startStr,
    endStr,
    equipmentName,
    refetchReserves,
    setDone,
    setCart,
  });

  const resetRangeSelection = () => {
    setCart([]);
    setStep(1);
  };

  const restart = () => {
    setDone(false);
    setCart([]);
    setRange({ startIdx: null, endIdx: null });
    setStep(1);
  };

  // 完了画面はデータ取得状態に依存しないので最優先で出す。
  // これより後に置くと、成功直後のバックグラウンド refetch が失敗したときに
  // 「予約できたのにエラー画面に置き換わる」事故になる。
  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <DoneScreen
          doneText={`${rangeText} に ${cartItems.length}件の機材を予約しました`}
          onToMyPage={() => router.push("/ems/mypage")}
          onRestart={restart}
        />
      </div>
    );
  }

  // reserves の読み込み完了前に一覧を出すと、予約済みの機材まで
  // 「この期間は空いています」と表示されてしまうため、各取得の完了を待つ。
  if (eqLoading || reservesLoading || catLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  // 全画面エラーは「一度も空き状況を取得できていない」ときだけ。
  // 取得済みデータがあるのに visibilitychange 再取得の失敗などで画面ごと
  // 乗っ取ると、進行中のウィザードが消えてしまう。
  if (reservesError && !reservesLoaded) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-ink">空き状況を読み込めませんでした。</p>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          通信環境を確認して、もう一度お試しください。
        </p>
        <button
          type="button"
          onClick={() => refetchReserves()}
          className="mt-4 h-10 rounded-xl bg-brand px-5 text-sm font-bold text-white"
        >
          再試行
        </button>
      </div>
    );
  }

  const periodPanel = (
    <PeriodPanel
      year={viewYear}
      month0={viewMonth0}
      monthLabel={matrix.monthLabel}
      range={range}
      onRangeChange={(r) => {
        setRange(r);
        pruneForRange(r);
      }}
      onPrevMonth={goPrevMonth}
      onNextMonth={goNextMonth}
    />
  );
  const pickPanel = (
    <div className="flex flex-col gap-2.5">
      {rangeOk && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="機材名で検索"
              aria-label="機材名で検索"
              className="h-10 w-full rounded-xl border-[1.5px] border-line bg-white pl-9 pr-3 text-[13px] outline-none focus:border-brand"
            />
          </div>
          <button
            type="button"
            onClick={() => setFreeOnly((v) => !v)}
            aria-pressed={freeOnly}
            className={cn(
              "h-10 flex-none rounded-xl border-[1.5px] px-3 text-[12px] font-bold transition-colors",
              freeOnly
                ? "border-brand bg-brand-faint text-brand"
                : "border-line bg-white text-ink-muted"
            )}
          >
            空きのみ
          </button>
        </div>
      )}
      {rangeOk && visibleGroups.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-center text-[12.5px] text-ink-faint shadow-sm">
          条件に合う機材がありません
        </p>
      ) : (
        <EquipmentPickPanel groups={visibleGroups} rangeOk={rangeOk} onToggle={toggle} />
      )}
    </div>
  );
  const confirmPanel = (
    <ConfirmPanel
      cartItems={cartItems}
      rangeText={rangeText}
      days={days}
      onRemove={(id) => setCart((prev) => prev.filter((x) => x !== id))}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );

  return (
    <>
      {/* デスクトップ: 3カラム同時表示 */}
      <div className="hidden md:grid md:grid-cols-[340px_minmax(0,1fr)_320px] md:items-start md:gap-4">
        {periodPanel}
        <div>
          <div className="mb-3 flex items-center gap-2 px-1">
            <StepDot n={2} active />
            <span className="text-sm font-black">空き機材を選ぶ</span>
            {rangeOk && <span className="ml-auto text-[11px] text-ink-faint">{rangeText}</span>}
          </div>
          {pickPanel}
        </div>
        <div className="md:sticky md:top-24">{confirmPanel}</div>
      </div>

      {/* モバイル: ステップウィザード */}
      <div className="md:hidden">
        <StepIndicator step={step} />
        {step === 1 && (
          <div className="space-y-3">
            {periodPanel}
            <button
              type="button"
              disabled={!rangeOk}
              onClick={() => {
                // 空き一覧を最新の予約状況で出す（マウント時の1回きりだと、開きっぱなしの
                // タブで他の部員の予約が反映されず、確定時に初めて409で弾かれる）。
                void refetchReserves();
                setStep(2);
              }}
              className="h-12 w-full rounded-xl bg-brand text-sm font-bold text-white transition-opacity disabled:opacity-40"
            >
              空きを見る →
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3 pb-24">
            <div className="flex items-center justify-between px-1">
              <span className="text-[14.5px] font-black">{rangeText}の空き機材</span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[12.5px] font-bold text-brand"
              >
                期間を変更
              </button>
            </div>
            {pickPanel}
            {cart.length > 0 && (
              <div className="fixed inset-x-4 bottom-6 z-30 flex items-center gap-2.5 rounded-2xl bg-navy px-4 py-3 shadow-[0_12px_30px_-6px_rgba(16,36,62,.5)]">
                <span className="flex-1 text-[13.5px] font-bold text-white">
                  {cart.length}件選択中
                </span>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="h-10 rounded-xl bg-brand px-4 text-[13px] font-bold text-white"
                >
                  確認へ →
                </button>
              </div>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            {confirmPanel}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="h-11 w-full rounded-xl border-[1.5px] border-line-strong bg-white text-sm font-bold text-ink"
            >
              戻る
            </button>
          </div>
        )}
      </div>
    </>
  );
}
