import { AppHeader } from "@/app/(protected)/_components/AppHeader";

// /ems/* 共通レイアウト。従来は各ページが個別に <Header /> を import していたが、
// 共通ヘッダー（AppHeader）をここに巻き上げる。背景は surface トークン。
export default function EmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-surface">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    </div>
  );
}
