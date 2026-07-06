import { Skeleton } from "@/components/ui/skeleton";

// /ems/common はサーバー側で auth() + DB（ユーザー設定）を待ってから HTML を返すため、
// この loading 境界が無いと「カレンダー」タブを押しても応答が返るまで画面が変わらず、
// 反応していないように見えて二度タップされる。ページと同じ骨格を即時表示する。
export default function Loading() {
  return (
    <div>
      <h1 className="mb-3 text-lg font-black text-ink">カレンダー</h1>
      <div className="space-y-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-[360px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
