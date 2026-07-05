import { cn } from "@/lib/utils";

// 予約・機材の状態を表す小さなピルバッジ。デザイン（UI刷新案）の配色に合わせる。
// 正確な hex は Tailwind トークンに無い淡色なので inline style で指定する。
export type StatusTone = "success" | "danger" | "warning" | "info" | "neutral";

const TONES: Record<StatusTone, { bg: string; fg: string }> = {
  success: { bg: "#ECFDF3", fg: "#067647" }, // 空き
  danger: { bg: "#FEF3F2", fg: "#B42318" }, // 貸出中・滞納
  warning: { bg: "#FFFAEB", fg: "#B54708" }, // 予約あり
  info: { bg: "#EAF3FE", fg: "#1570CD" }, // 受取可
  neutral: { bg: "#F2F4F7", fg: "#475467" }, // 予約済
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  const c = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold",
        className
      )}
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  );
}

// 予約の isRenting コード（0=予約中/1=受取可/2=貸出中/3=滞納）を
// バッジの tone + ラベルに写像する。呼び出し側の分岐を一箇所に集約する。
export function reservationStatus(isRenting?: number | null): {
  tone: StatusTone;
  label: string;
} {
  switch (isRenting) {
    case 1:
      return { tone: "info", label: "受取可" };
    case 2:
      return { tone: "danger", label: "貸出中" };
    case 3:
      return { tone: "danger", label: "滞納" };
    default:
      return { tone: "neutral", label: "予約済" };
  }
}
