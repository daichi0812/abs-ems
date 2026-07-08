"use client";

import Image from "next/image";
import { UserRole, WorkspaceRole } from "@prisma/client";

import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentRole } from "@/hooks/use-current-role";
import { MEMBER_PALETTE, memberInitial } from "@/lib/calendar/member-colors";
import { useProfileActions } from "../hooks/use-profile-actions";

const WS_ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: "オーナー",
  ADMIN: "管理者",
  MEMBER: "メンバー",
};

// アバター＋表示名＋テーマカラーのカード。表示は user / role から、
// 保存系の状態とアクションは useProfileActions から受け取る。
export function ProfileSection() {
  const user = useCurrentUser();
  const role = useCurrentRole();
  const {
    name,
    setName,
    savingName,
    onSaveProfile,
    avatarInputRef,
    avatarUploading,
    onAvatarSelected,
    savingColor,
    onSelectColor,
  } = useProfileActions();

  // 「ワークスペース名・ロール」表示（旧「放送部・管理者/部員」のワークスペース対応版）。
  // ワークスペースのロールが未解決の間はグローバル role から補う。
  const wsName = user?.currentWorkspaceName;
  const wsRole = user?.workspaceRole
    ? WS_ROLE_LABEL[user.workspaceRole]
    : role === UserRole.ADMIN
      ? "管理者"
      : "メンバー";
  const roleLabel = wsName ? `${wsName}・${wsRole}` : wsRole;

  return (
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
  );
}
