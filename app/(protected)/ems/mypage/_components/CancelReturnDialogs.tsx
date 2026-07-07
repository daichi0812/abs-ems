"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ReserveActionTarget } from "./ReservationCard";

interface CancelReturnDialogsProps {
  cancelTarget: ReserveActionTarget | null;
  returnTarget: ReserveActionTarget | null;
  onCancelClose: () => void;
  onReturnClose: () => void;
  onConfirmCancel: (reserveIds: number[]) => void;
  onConfirmReturn: (reserveIds: number[]) => void;
}

/** マイ予約のキャンセル・返却の確認ダイアログ。どちらも取り消せない操作なので確認を挟む。 */
export function CancelReturnDialogs({
  cancelTarget,
  returnTarget,
  onCancelClose,
  onReturnClose,
  onConfirmCancel,
  onConfirmReturn,
}: CancelReturnDialogsProps) {
  return (
    <>
      {/* キャンセル確認 */}
      <AlertDialog
        open={cancelTarget != null}
        onOpenChange={(open) => !open && onCancelClose()}
      >
        <AlertDialogContent className="max-w-[360px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">
              予約をキャンセルしますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px]">
              {cancelTarget?.items.length === 1
                ? `「${cancelTarget.items[0].name}」の予約を取り消します。`
                : `${cancelTarget?.rangeText} の予約 ${cancelTarget?.items.length}件（${cancelTarget?.items
                    .map((it) => it.name)
                    .join("・")}）を取り消します。`}
              この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>戻る</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger hover:bg-danger/90"
              onClick={() => {
                if (cancelTarget) {
                  onConfirmCancel(cancelTarget.items.map((it) => it.reserveId));
                }
                onCancelClose();
              }}
            >
              キャンセルする
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 返却確認。誤タップで即「返却済」になると本人が元に戻せない（4→2 の遷移が無い）ため、
          キャンセルと同じく確認を挟む */}
      <AlertDialog
        open={returnTarget != null}
        onOpenChange={(open) => !open && onReturnClose()}
      >
        <AlertDialogContent className="max-w-[360px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">機材を返却しますか？</AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px]">
              {returnTarget?.items.length === 1
                ? `「${returnTarget.items[0].name}」を返却済みにします。`
                : `${returnTarget?.rangeText} の機材 ${returnTarget?.items.length}件（${returnTarget?.items
                    .map((it) => it.name)
                    .join("・")}）を返却済みにします。`}
              機材は所定の場所に戻しましたか？この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>戻る</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (returnTarget) {
                  onConfirmReturn(returnTarget.items.map((it) => it.reserveId));
                }
                onReturnClose();
              }}
            >
              返却する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
