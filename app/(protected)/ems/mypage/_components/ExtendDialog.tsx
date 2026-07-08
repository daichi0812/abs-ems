"use client";

import { useEffect, useState } from "react";
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
import { dayIndexToDateString } from "@/lib/calendar/date-grid";
import type { ExtendActionTarget } from "./ReservationCard";

interface ExtendDialogProps {
  target: ExtendActionTarget | null;
  onClose: () => void;
  /** newEnd は YYYY-MM-DD（延長後の返却日） */
  onConfirm: (reserveIds: number[], newEnd: string) => void;
}

/**
 * マイ予約の延長ダイアログ。同一期間グループの未返却機材をまとめて、新しい返却日まで延長する。
 * 他の予約と重なる機材はサーバー側で個別に弾かれる（部分成功は toast で件数報告される）。
 */
export function ExtendDialog({ target, onClose, onConfirm }: ExtendDialogProps) {
  // 現在の返却日の翌日が選択できる最短の日付
  const minDate = target ? dayIndexToDateString(target.endIdx + 1) : "";
  const [newEnd, setNewEnd] = useState("");

  // 対象が変わるたびに既定値（翌日）へリセット
  useEffect(() => {
    setNewEnd(target ? dayIndexToDateString(target.endIdx + 1) : "");
  }, [target]);

  const valid = newEnd >= minDate && newEnd !== "";

  return (
    <AlertDialog open={target != null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-[360px] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[15px]">予約を延長しますか？</AlertDialogTitle>
          <AlertDialogDescription className="text-[12.5px]">
            {target?.items.length === 1
              ? `「${target.items[0].name}」の返却日を延長します。`
              : `${target?.rangeText} の機材 ${target?.items.length}件（${target?.items
                  .map((it) => it.name)
                  .join("・")}）の返却日を延長します。`}
            延長後の期間に他の部員の予約がある機材は延長できません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="block px-0.5">
          <span className="mb-1 block text-[11px] font-bold text-ink-muted">新しい返却日</span>
          <input
            type="date"
            value={newEnd}
            min={minDate}
            onChange={(e) => setNewEnd(e.target.value)}
            className="h-10 w-full rounded-xl border-[1.5px] border-line bg-white px-3 text-[13px] outline-none focus:border-brand"
          />
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>戻る</AlertDialogCancel>
          <AlertDialogAction
            disabled={!valid}
            onClick={() => {
              if (target && valid) {
                onConfirm(
                  target.items.map((it) => it.reserveId),
                  newEnd
                );
              }
              onClose();
            }}
          >
            延長する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
