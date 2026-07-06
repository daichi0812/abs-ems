"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useEquipments } from "@/app/(protected)/ems/_hooks/use-equipments";
import { useCategories } from "@/app/(protected)/ems/equipment-list/hooks/use-categories";
import { useReserves } from "@/app/(protected)/ems/equipment-list/hooks/use-reserves";
import { useCreateReservations } from "@/app/(protected)/ems/equipment-list/hooks/use-create-reservations";

import {
  buildMonthMatrix,
  toJstDayIndex,
  todayJstDayIndex,
  formatRange,
  dayIndexToDateString,
} from "@/lib/calendar/date-grid";
import { categoryColor, categoryIconPath } from "@/lib/category-colors";
import { flattenNewlines } from "@/lib/text";
import type { DayRange } from "@/components/calendar/RangeMiniCalendar";
import type { Equipment } from "@/types/domain";
import { Skeleton } from "@/components/ui/skeleton";

import { PeriodPanel } from "./PeriodPanel";
import { EquipmentPickPanel } from "./EquipmentPickPanel";
import { ConfirmPanel } from "./ConfirmPanel";
import { DoneScreen } from "./DoneScreen";
import type { CartItem, PickGroup } from "./types";

interface UserLite {
  id: string;
  name: string;
}

export function BookingWizard() {
  const router = useRouter();
  const { equipments, isLoading: eqLoading } = useEquipments();
  const { categories } = useCategories();
  const {
    reserves,
    isLoading: reservesLoading,
    isError: reservesError,
    refetch: refetchReserves,
  } = useReserves();
  const { isSubmitting, createReservations } = useCreateReservations();

  const [users, setUsers] = useState<UserLite[]>([]);
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]));
  }, []);

  const todayIdx = todayJstDayIndex();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth0, setViewMonth0] = useState(now.getMonth());
  const matrix = useMemo(() => buildMonthMatrix(viewYear, viewMonth0), [viewYear, viewMonth0]);

  const [range, setRange] = useState<DayRange>({ startIdx: null, endIdx: null });
  const [cart, setCart] = useState<number[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1); // モバイルのステップ
  const [done, setDone] = useState(false);

  const rangeOk = range.startIdx != null && range.endIdx != null;
  const startStr = range.startIdx != null ? dayIndexToDateString(range.startIdx) : "";
  const endStr = range.endIdx != null ? dayIndexToDateString(range.endIdx) : "";
  const rangeText = rangeOk ? formatRange(range.startIdx!, range.endIdx!) : "";
  const days = rangeOk ? range.endIdx! - range.startIdx! + 1 : 0;

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? "他の人";
  const equipmentName = (id: number) => equipments.find((e) => e.id === id)?.name ?? `#${id}`;

  // カテゴリ順にグループ化し、期間中の空き状況を付与する
  const groups = useMemo<PickGroup[]>(() => {
    if (!rangeOk) return [];

    const toItem = (e: Equipment) => {
      const conflict = reserves.find(
        (r) =>
          r.list_id === e.id &&
          range.startIdx! <= toJstDayIndex(r.end) &&
          range.endIdx! >= toJstDayIndex(r.start)
      );
      const free = !conflict;
      return {
        id: e.id,
        name: e.name,
        detail: flattenNewlines(e.detail ?? ""),
        image: e.image ?? "",
        free,
        sub: free
          ? "この期間は空いています"
          : `${formatRange(toJstDayIndex(conflict!.start), toJstDayIndex(conflict!.end))} ${userName(conflict!.user_id)}が予約`,
        selected: cart.includes(e.id),
      };
    };

    const grouped = categories.map((cat) => ({
      catId: String(cat.id),
      catName: cat.name,
      color: categoryColor(cat.color),
      iconPath: categoryIconPath(cat.name),
      items: equipments.filter((e) => String(e.tag_id) === String(cat.id)).map(toItem),
    }));

    // カテゴリ未設定・カテゴリ削除後の機材も「未分類」として末尾に出す。
    // 以前はどのグループにも入らず、部員からは機材が消えて予約不可能になっていた。
    // categories が空の間（読み込み中）は全機材が未分類に見えてしまうため出さない。
    if (categories.length > 0) {
      const knownIds = new Set(categories.map((c) => String(c.id)));
      const uncategorized = equipments.filter(
        (e) => e.tag_id == null || !knownIds.has(String(e.tag_id))
      );
      if (uncategorized.length > 0) {
        grouped.push({
          catId: "uncategorized",
          catName: "未分類",
          color: categoryColor(null),
          iconPath: categoryIconPath(null),
          items: uncategorized.map(toItem),
        });
      }
    }

    return grouped.filter((g) => g.items.length > 0);
  }, [categories, equipments, reserves, rangeOk, range, cart, users]);

  const cartItems = useMemo<CartItem[]>(
    () =>
      cart.map((id) => {
        const e = equipments.find((q) => q.id === id);
        const cat = categories.find((c) => String(c.id) === String(e?.tag_id));
        const color = categoryColor(cat?.color);
        return {
          id,
          name: e?.name ?? "",
          image: e?.image ?? "",
          color,
          iconPath: categoryIconPath(cat?.name),
        };
      }),
    [cart, equipments, categories]
  );

  const toggle = (id: number) =>
    setCart((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetRangeSelection = () => {
    setCart([]);
    setStep(1);
  };
  const goPrevMonth = () => {
    setViewMonth0((m) => (m === 0 ? 11 : m - 1));
    if (viewMonth0 === 0) setViewYear((y) => y - 1);
  };
  const goNextMonth = () => {
    setViewMonth0((m) => (m === 11 ? 0 : m + 1));
    if (viewMonth0 === 11) setViewYear((y) => y + 1);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    const res = await createReservations(cart, startStr, endStr);
    if (res.ok) {
      // 完了画面は空き状況を使わないので refetch を待たずに先へ進める
      // （待つ間に isSubmitting が解けて確定ボタンが再活性化し、二度押しできる窓があった）。
      setDone(true);
      void refetchReserves();
      return;
    }
    await refetchReserves();
    if (res.createdCount > 0) {
      // 部分成功: 予約できた機材はカートから外し、できなかった機材を機材名で明示する。
      // 全体を失敗のように伝えると、成功分まで期間を変えて予約し直す二重予約につながる。
      setCart((prev) => prev.filter((id) => !res.createdIds.includes(id)));
      toast.success(`${res.createdCount}件は予約が完了しました（マイ予約で確認できます）。`, {
        duration: 8000,
      });
      if (res.conflictIds.length > 0) {
        toast.error(
          `${res.conflictIds.map(equipmentName).join("、")} は期間の重なる予約があり予約できませんでした。期間を変えて再度お試しください。`,
          { duration: 8000 }
        );
      } else {
        toast.error(res.errorMessage ?? "一部の機材が予約できませんでした。");
      }
    } else if (res.conflict) {
      toast.error(
        `${res.conflictIds.map(equipmentName).join("、")} は選択した期間にすでに予約が入っています。期間を変更してください。`
      );
    } else {
      // API が返す具体的な理由（「予約開始日は今日以降にしてください。」等）をそのまま見せる
      toast.error(res.errorMessage ?? "予約の作成中にエラーが発生しました。");
    }
  };

  const restart = () => {
    setDone(false);
    setCart([]);
    setRange({ startIdx: null, endIdx: null });
    setStep(1);
  };

  // reserves の読み込み完了前に一覧を出すと、予約済みの機材まで
  // 「この期間は空いています」と表示されてしまうため、両方の完了を待つ。
  if (eqLoading || reservesLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  if (reservesError) {
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

  const periodPanel = (
    <PeriodPanel
      year={viewYear}
      month0={viewMonth0}
      monthLabel={matrix.monthLabel}
      range={range}
      onRangeChange={(r) => {
        setRange(r);
        // 期間変更でカートを全消去すると「期間を変更してください」の案内に従った
        // ユーザーが機材を全部選び直すことになるため、新しい期間で空きがない機材
        // だけを外す（期間選択の途中 = endIdx 未確定の間は何もしない）。
        if (r.startIdx == null || r.endIdx == null) return;
        const dropped = cart.filter((id) =>
          reserves.some(
            (rv) =>
              rv.list_id === id &&
              r.startIdx! <= toJstDayIndex(rv.end) &&
              r.endIdx! >= toJstDayIndex(rv.start)
          )
        );
        if (dropped.length > 0) {
          setCart((prev) => prev.filter((id) => !dropped.includes(id)));
          toast(
            `${dropped.map(equipmentName).join("、")} は新しい期間では空きがないため選択から外しました。`
          );
        }
      }}
      onPrevMonth={goPrevMonth}
      onNextMonth={goNextMonth}
    />
  );
  const pickPanel = (
    <EquipmentPickPanel groups={groups} rangeOk={rangeOk} onToggle={toggle} />
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

function StepDot({ n, active }: { n: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11.5px] font-bold",
        active ? "bg-brand text-white" : "bg-white text-ink-faint"
      )}
      style={!active ? { border: "2px solid #D0D5DD" } : undefined}
    >
      {n}
    </span>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "期間" },
    { n: 2, label: "機材" },
    { n: 3, label: "確認" },
  ];
  return (
    <div className="mb-4 flex items-center px-2">
      {steps.map((st, i) => {
        const active = step === st.n;
        const done = step > st.n;
        return (
          <div key={st.n} className="flex items-center" style={{ flex: i < 2 ? 1 : "none" }}>
            <div className="flex flex-none flex-col items-center gap-1">
              <span
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-bold transition-colors"
                style={{
                  background: active || done ? "#2E90FA" : "#fff",
                  border: `2px solid ${active || done ? "#2E90FA" : "#D0D5DD"}`,
                  color: active || done ? "#fff" : "#98A2B3",
                }}
              >
                {done ? "✓" : st.n}
              </span>
              <span
                className="text-[10px] font-bold"
                style={{ color: active ? "#101828" : "#98A2B3" }}
              >
                {st.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className="mx-1.5 mb-4 h-0.5 flex-1"
                style={{ background: step > st.n ? "#2E90FA" : "#E4E7EC" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
