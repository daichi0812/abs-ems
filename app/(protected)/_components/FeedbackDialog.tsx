"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** アプリ内フィードバック（本文1欄だけの最小ダイアログ。名前・ページは自動付与） */
export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const pathname = usePathname();
  const [feedbackBody, setFeedbackBody] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);

  const onSubmitFeedback = async () => {
    const body = feedbackBody.trim();
    if (!body) {
      toast.error("内容を入力してください");
      return;
    }
    setFeedbackSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, path: pathname }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "送信に失敗しました");
        return;
      }
      toast.success("フィードバックを送信しました。ありがとうございます！");
      setFeedbackBody("");
      onOpenChange(false);
    } catch {
      toast.error("送信に失敗しました");
    } finally {
      setFeedbackSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">フィードバックを送る</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            不具合・使いにくい点・要望など、気づいたことをそのままどうぞ。
            開発者にそのまま届きます。
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={feedbackBody}
          onChange={(e) => setFeedbackBody(e.target.value)}
          placeholder="例）予約の画面で◯◯が押しづらい、△△できると嬉しい など"
          rows={4}
          maxLength={2000}
          className="w-full resize-none rounded-xl border-[1.5px] border-line px-3 py-2.5 text-[13.5px] outline-none focus:border-brand"
          autoFocus
        />
        <button
          type="button"
          onClick={onSubmitFeedback}
          disabled={feedbackSending || feedbackBody.trim().length === 0}
          className="h-11 w-full rounded-xl bg-brand text-[14px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          {feedbackSending ? "送信中…" : "送信する"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
