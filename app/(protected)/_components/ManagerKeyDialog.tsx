"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManagerKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 非 ADMIN 向けの管理者パスワード入力（NEXT_PUBLIC_MANAGER_KEY フォールバック。
// 運用者への role=ADMIN 付与が整ったら退役する。lib/manager-auth.ts と同じ位置づけ）。
export function ManagerKeyDialog({ open, onOpenChange }: ManagerKeyDialogProps) {
  const router = useRouter();
  const [managerKey, setManagerKey] = useState("");

  const onSubmitManagerKey = () => {
    if (managerKey === process.env.NEXT_PUBLIC_MANAGER_KEY) {
      onOpenChange(false);
      setManagerKey("");
      router.push("/ems/manager");
    } else {
      toast.error("パスワードが間違っています");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">管理者用ページ</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            管理者パスワードを入力してください。
          </DialogDescription>
        </DialogHeader>
        <input
          type="password"
          value={managerKey}
          onChange={(e) => setManagerKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmitManagerKey()}
          placeholder="パスワード"
          className="h-11 w-full rounded-xl border-[1.5px] border-line px-3 text-[14px] outline-none focus:border-brand"
          autoFocus
        />
        <button
          type="button"
          onClick={onSubmitManagerKey}
          className="h-11 w-full rounded-xl bg-brand text-[14px] font-bold text-white transition-colors hover:bg-brand-dark"
        >
          開く
        </button>
      </DialogContent>
    </Dialog>
  );
}
