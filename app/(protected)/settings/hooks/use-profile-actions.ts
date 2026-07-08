"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { UserRole } from "@prisma/client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { settings as saveAccount } from "@/actions/settings";
import { compressImage } from "@/lib/image-compress";
import { MEMBER_PALETTE } from "@/lib/calendar/member-colors";

// プロフィールカードの非同期アクション（表示名保存 / アバター圧縮アップロード /
// テーマカラー保存）と、それぞれの pending 状態・入力状態をまとめて扱う。
export const useProfileActions = () => {
  const user = useCurrentUser();
  const { update } = useSession();

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

  return {
    name,
    setName,
    savingName,
    onSaveProfile,
    avatarInputRef,
    avatarUploading,
    onAvatarSelected,
    savingColor,
    onSelectColor,
  };
};
