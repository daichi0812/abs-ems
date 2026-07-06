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
  "#9F1AB1", // magenta
  "#3E4784", // dark indigo
  "#B54708", // brown
  "#0E7090", // dark cyan
  "#C11574", // dark pink
  "#66C61C", // lime
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

/**
 * 部員一覧に対して、できるだけ重複しない色割り当てを返す。
 * 素のハッシュ剰余だと少人数でも高確率で衝突し（誕生日のパラドックス）、
 * 月表示の「色＝人」の前提が崩れるため、各名前のハッシュ色を起点に
 * 空いている色へ線形探索でずらす。パレット数を超えたら重複はやむなし。
 *
 * priorityNames には「いま表示している月の部員」を渡す。全履歴のユニーク部員が
 * パレット数（16人）を超えても、先に割り当てる表示中の部員同士は一意性が守られる
 * （卒業生など履歴上の名前が一意枠を食いつぶすのを防ぐ）。
 * 各グループ内は名前昇順で割り当てるため、同じメンバー集合なら結果は安定
 * （メンバーが増減すると他の人の色が変わり得るのは一意性とのトレードオフ）。
 */
export function memberColorMap(
  names: (string | null | undefined)[],
  priorityNames: (string | null | undefined)[] = []
): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<number>();
  const assign = (list: (string | null | undefined)[]) => {
    const unique = [...new Set(list.filter((n): n is string => !!n))].sort();
    for (const name of unique) {
      if (map.has(name)) continue;
      let idx = hashString(name) % MEMBER_PALETTE.length;
      if (used.size < MEMBER_PALETTE.length) {
        while (used.has(idx)) idx = (idx + 1) % MEMBER_PALETTE.length;
      }
      used.add(idx);
      map.set(name, MEMBER_PALETTE[idx]);
    }
  };
  assign(priorityNames);
  assign(names);
  return map;
}

/** アバター等のイニシャル（先頭1文字）。 */
export function memberInitial(name: string | null | undefined): string {
  return name?.trim()?.[0] ?? "?";
}
