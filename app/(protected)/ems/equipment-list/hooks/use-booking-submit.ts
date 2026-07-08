"use client";

import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

import { useCreateReservations } from "@/app/(protected)/ems/equipment-list/hooks/use-create-reservations";

interface UseBookingSubmitParams {
  cart: number[];
  startStr: string;
  endStr: string;
  equipmentName: (id: number) => string;
  refetchReserves: () => Promise<void>;
  setDone: Dispatch<SetStateAction<boolean>>;
  setCart: Dispatch<SetStateAction<number[]>>;
}

// 予約確定の処理。機材ごとの個別 POST の結果（全件成功 / 部分成功 / 競合 / その他失敗）を
// 判定し、完了画面への遷移・カート整理・トースト通知を出し分ける。
export function useBookingSubmit({
  cart,
  startStr,
  endStr,
  equipmentName,
  refetchReserves,
  setDone,
  setCart,
}: UseBookingSubmitParams) {
  const { isSubmitting, createReservations } = useCreateReservations();

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
      // トーストは1本に統合する（2本重ねるとモバイルでは背面の成功分が読めない）。
      setCart((prev) => prev.filter((id) => !res.createdIds.includes(id)));
      if (res.conflictIds.length > 0) {
        toast.error(
          `${res.conflictIds.map(equipmentName).join("、")} は期間の重なる予約があり予約できませんでした。それ以外の${res.createdCount}件は予約済みです（マイ予約で確認できます）。期間を変えて再度お試しください。`,
          { duration: 10000 }
        );
      } else {
        toast.error(
          `一部の機材が予約できませんでした（${res.createdCount}件は予約済み。マイ予約で確認できます）。${res.errorMessage ?? ""}`,
          { duration: 10000 }
        );
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

  return { isSubmitting, handleSubmit };
}
