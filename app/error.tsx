"use client";

// サーバーレンダリング中の例外（DB 接続の瞬断など）で Next.js 既定の英語エラー画面
//（再試行導線なし）に落ちないためのエラー境界。アプリのトーンで再試行を案内する。
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Unhandled app error:", error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-ink">ページを読み込めませんでした。</p>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          通信環境を確認して、もう一度お試しください。
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 h-10 w-full rounded-xl bg-brand text-sm font-bold text-white"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
