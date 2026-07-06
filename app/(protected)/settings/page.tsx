"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { UserRole } from "@prisma/client";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentRole } from "@/hooks/use-current-role";
import { settings as saveAccount } from "@/actions/settings";
import { compressImage } from "@/lib/image-compress";
import { MEMBER_PALETTE, memberInitial } from "@/lib/calendar/member-colors";
import { useUserSettings } from "./hooks/use-user-settings";
import { AccountSection } from "./_components/AccountSection";

export default function SettingsPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const role = useCurrentRole();
  const { update } = useSession();
  const { settings, isLoading, patch } = useUserSettings();

  // 戻る先を /ems/mypage に固定すると、カレンダー等から来た場合に文脈が失われる。
  // 履歴があれば来た画面へ、なければ（直リンク・PWA起動直後）マイ予約へ。
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/ems/mypage");
  };

  const [name, setName] = useState("");
  const [savingName, startNameSave] = useTransition();

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const onSaveProfile = () => {
    startNameSave(async () => {
      const result = await saveAccount({
        name: name.trim(),
        role: (user?.role as UserRole) || UserRole.USER,
      });
      if (result.error) toast.error(result.error);
      if (result.success) {
        // セッション(JWT)を更新しないと、このカードやヘッダーの表示名が旧名のまま残り
        // 「保存に失敗した？」と見える（AccountSection の保存処理と同じパターン）。
        // 引数なしの update() は GET になり jwt コールバックに trigger="update" が
        // 渡らない（DB 再照会がスキップされる）ため、必ず update({}) で POST にする。
        await update({});
        toast.success("プロフィールを保存しました");
      }
    });
  };

  // アイコン画像: 選択→クライアント圧縮→アップロード→セッション更新。
  // 保存ボタンは挟まず、ファイルを選んだ時点で反映する（失敗時はトーストで通知）。
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const onAvatarSelected = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }
    setAvatarUploading(true);
    try {
      // アバターは最大64pxの丸表示なので512pxで十分（機材画像の1600pxより強めに縮める）
      const compressed = await compressImage(file, {
        maxEdgePx: 512,
        recompressThresholdBytes: 100 * 1024,
      });
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        headers: { "Content-Type": compressed.type || "application/octet-stream" },
        body: compressed,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "アイコンの更新に失敗しました");
        return;
      }
      await update({});
      toast.success("アイコンを更新しました");
    } catch {
      toast.error("アイコンの更新に失敗しました");
    } finally {
      setAvatarUploading(false);
    }
  };

  // テーマカラー: スワッチをタップした時点で保存する（null = 自動割り当てへ戻す）
  const [savingColor, startColorSave] = useTransition();
  const onSelectColor = (color: (typeof MEMBER_PALETTE)[number] | null) => {
    if (color === (user?.color ?? null)) return;
    startColorSave(async () => {
      const result = await saveAccount({
        color,
        role: (user?.role as UserRole) || UserRole.USER,
      });
      if (result.error) toast.error(result.error);
      if (result.success) {
        await update({});
        toast.success("テーマカラーを保存しました");
      }
    });
  };

  const roleLabel = role === UserRole.ADMIN ? "放送部・管理者" : "放送部・部員";

  return (
    <div className="min-h-screen bg-surface">
      {/* ネイビーヘッダー */}
      <div className="bg-navy px-4 pb-4 pt-5">
        <div className="mx-auto flex max-w-xl items-center gap-2.5">
          <button type="button" onClick={goBack} aria-label="戻る" className="text-white/90 hover:text-white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="text-lg font-black tracking-wide text-white">設定</span>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pb-16 pt-4">
        {/* プロフィール */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="アイコン画像を変更"
              className="relative h-16 w-16 flex-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {user?.image ? (
                <Image
                  src={user.image}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-black text-white"
                  style={user?.color ? { background: user.color } : undefined}
                >
                  {memberInitial(user?.name, { uppercase: true })}
                </span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-ink text-white">
                {avatarUploading ? (
                  <svg
                    className="h-3 w-3 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.2-8.56" />
                  </svg>
                ) : (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // 同じファイルを選び直しても change が発火するようにリセットする
                e.target.value = "";
                void onAvatarSelected(file);
              }}
            />
            <div className="min-w-0">
              <p className="m-0 truncate text-[17px] font-black text-ink">{user?.name ?? "ゲスト"}</p>
              <p className="m-0 mt-0.5 text-xs text-ink-muted">{roleLabel}</p>
              <p className="m-0 mt-1 text-[11px] text-ink-faint">タップしてアイコンを変更</p>
            </div>
          </div>
          <p className="m-0 mb-2 mt-4 text-xs font-bold text-ink-muted">表示名</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-[46px] w-full rounded-xl border-[1.5px] border-line bg-[#F9FAFB] px-3.5 text-[15px] outline-none focus:border-brand focus:bg-white"
          />
          <button
            type="button"
            onClick={onSaveProfile}
            disabled={savingName || name.trim() === ""}
            className="mt-3.5 h-[46px] w-full rounded-xl bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {savingName ? "保存中…" : "プロフィールを保存"}
          </button>

          {/* テーマカラー（カレンダーの「色＝人」で自分の予約バーに使う色） */}
          <p className="m-0 mb-1 mt-5 text-xs font-bold text-ink-muted">テーマカラー</p>
          <p className="m-0 mb-2.5 text-[11.5px] leading-snug text-ink-faint">
            カレンダーであなたの予約バーに使われる色。「自動」はメンバー構成から自動で割り当てます
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={savingColor}
              onClick={() => onSelectColor(null)}
              aria-pressed={user?.color == null}
              className={cn(
                "flex h-9 items-center rounded-full border-[1.5px] px-3.5 text-xs font-bold transition-colors",
                user?.color == null
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink-sub"
              )}
            >
              自動
            </button>
            {MEMBER_PALETTE.map((c) => {
              const selected = user?.color === c;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={savingColor}
                  onClick={() => onSelectColor(c)}
                  aria-label={`テーマカラー ${c}`}
                  aria-pressed={selected}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform",
                    selected ? "scale-110 border-ink" : "border-transparent"
                  )}
                  style={{ background: c }}
                >
                  {selected && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 通知 */}
        <SectionLabel>通知</SectionLabel>
        <div className="rounded-2xl bg-white px-4 shadow-sm">
          <ToggleRow
            title="返却期限のリマインド"
            desc="返却期限の当日朝にお知らせ"
            checked={settings.notifyReturnReminder}
            disabled={isLoading}
            onChange={(v) => patch({ notifyReturnReminder: v })}
            divider
          />
          <ToggleRow
            title="予約の承認・変更"
            desc="自分の予約が更新されたとき"
            checked={settings.notifyReservationEvents}
            disabled={isLoading}
            onChange={(v) => patch({ notifyReservationEvents: v })}
            divider
          />
          <ToggleRow
            title="新しい機材の追加"
            desc="部の機材が増えたとき"
            checked={settings.notifyNewEquipment}
            disabled={isLoading}
            onChange={(v) => patch({ notifyNewEquipment: v })}
          />
        </div>

        {/* 連携 */}
        <SectionLabel>連携</SectionLabel>
        <div className="rounded-2xl bg-white px-4 shadow-sm">
          <div className="flex items-center gap-3 py-3.5">
            <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-[#06C755] text-[15px] font-black text-white">
              L
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-bold text-ink">LINE通知</p>
              <p className="m-0 mt-0.5 text-[11.5px] leading-snug text-ink-faint">
                {settings.lineNotifyEnabled ? "有効（友だち追加は後日ご案内）" : "友だち追加で受け取れます（準備中）"}
              </p>
            </div>
            <Switch
              disabled={isLoading}
              checked={settings.lineNotifyEnabled}
              onCheckedChange={(v) => patch({ lineNotifyEnabled: v })}
            />
          </div>
        </div>

        {/* 表示 */}
        <SectionLabel>表示</SectionLabel>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="m-0 mb-2.5 text-sm font-bold text-ink">カレンダーの初期表示</p>
          <div className="flex gap-1 rounded-xl bg-line-soft p-[3px]">
            {(
              [
                ["MONTH", "月表示"],
                ["GANTT", "ガント"],
              ] as const
            ).map(([value, label]) => {
              const on = settings.calendarDefaultView === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={isLoading}
                  onClick={() => patch({ calendarDefaultView: value })}
                  className={cn(
                    "h-[38px] flex-1 rounded-[9px] text-[13px] font-bold transition-colors",
                    on ? "bg-white text-ink shadow-sm" : "text-ink-muted"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* アカウント（メール・パスワード・2段階認証）。Google ログインのユーザーには
            変更できる項目がなく AccountSection が null を返すため、見出しと空カードごと出さない */}
        {user?.isOAuth !== true && (
          <>
            <SectionLabel>アカウント</SectionLabel>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <AccountSection />
            </div>
          </>
        )}

        {/* ログアウト */}
        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/auth/login" })}
          className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#FEE4E2] bg-white text-sm font-bold text-danger transition-colors hover:bg-[#FFF5F4]"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          ログアウト
        </button>
        <p className="mt-4 text-center text-[11px] text-line-strong">ABS EMS v2.0</p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 ml-1 mt-5 text-[11.5px] font-extrabold tracking-wider text-ink-faint">
      {children}
    </p>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  disabled,
  onChange,
  divider,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  divider?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 py-3.5", divider && "border-b border-line-soft")}>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold text-ink">{title}</p>
        <p className="m-0 mt-0.5 text-[11.5px] leading-snug text-ink-faint">{desc}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
