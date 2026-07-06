// 予約者（部員）ごとの安定した色割り当て。
// 月カレンダーは「色＝人」で予約バーを塗る（UI刷新案 3a）。DB に部員色が無いため、
// 名前をキーに固定パレットへ決定的に写像する（同じ名前は常に同じ色）。

const MEMBER_PALETTE = [
  "#2563EB", // blue
  "#12B76A", // green
  "#F79009", // orange
  "#7A5AF8", // violet
  "#EF4444", // red
  "#0BA5EC", // sky
  "#EE46BC", // pink
  "#EAAA08", // amber
  "#4E5BA6", // indigo-gray
  "#15B79E", // teal
] as const;

/** 文字列 → 安定した非負ハッシュ（djb2）。 */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 部員名からバー色を決定的に返す。 */
export function memberColor(name: string | null | undefined): string {
  if (!name) return "#667085";
  return MEMBER_PALETTE[hashString(name) % MEMBER_PALETTE.length];
}

/** アバター等のイニシャル（先頭1文字）。 */
export function memberInitial(name: string | null | undefined): string {
  return name?.trim()?.[0] ?? "?";
}
