import { cn } from "@/lib/utils";
import { categoryColor } from "@/lib/category-colors";

// カテゴリ名 + カラードットの小さなピル。マイ予約の機材チップや凡例など、
// 「そのカテゴリを示すラベル」を出す用途の静的表示部品。
export function CategoryChip({
  name,
  color,
  className,
}: {
  name: string;
  color?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[27px] items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[11px] font-semibold text-ink-sub",
        className
      )}
    >
      <span
        className="h-[7px] w-[7px] flex-none rounded-full"
        style={{ background: categoryColor(color) }}
      />
      <span className="whitespace-nowrap">{name}</span>
    </span>
  );
}
