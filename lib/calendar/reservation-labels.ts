import { formatDayIndexShort } from "./date-grid";

// 予約の「返却までの状態」ラベル。UI刷新案の leftTxt を移植（inclusive-end 前提）。
export function daysLeftLabel(startIdx: number, endIdx: number, todayIdx: number): string {
  if (startIdx > todayIdx) return `${formatDayIndexShort(startIdx)}開始予定`;
  if (endIdx < todayIdx) return "期限超過";
  if (endIdx === todayIdx) return "今日返却";
  return `あと${endIdx - todayIdx}日`;
}
