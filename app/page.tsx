"use client";

import { Poppins } from "next/font/google";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { LoginButton } from "@/components/auth/login-button";

const font = Poppins({
  subsets: ["latin"],
  weight: ["600"],
});

export default function Home() {
  const [isPending, startTransition] = useTransition();

  return (
    <main className="flex h-full flex-col items-center justify-center bg-navy">
      <div className="space-y-6 text-center">
        <h1 className={cn("text-6xl font-semibold text-white drop-shadow-md", font.className)}>
          Logicode
        </h1>
        <p className="text-lg text-white/80">ABS Equipment Management System</p>
        <div>
          <LoginButton asChild startTransition={startTransition}>
            <button
              type="button"
              disabled={isPending}
              className="h-11 rounded-xl bg-white px-8 text-sm font-bold text-navy transition-colors hover:bg-white/90 disabled:opacity-60"
            >
              {isPending ? "読み込み中…" : "サインイン"}
            </button>
          </LoginButton>
        </div>
      </div>
    </main>
  );
}
