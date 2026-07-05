// 週内バーのレーン詰め（純関数）。UI刷新案の packLanes を一般化したもの。
// 同じ週で期間が重なるバー同士が縦に重ならないよう、貪欲に最小レーンへ割り当てる。

export interface WeekSegment {
  startCol: number; // 週内の開始列 0..6（inclusive）
  endCol: number; // 週内の終了列 0..6（inclusive）
}

/**
 * 各セグメントに lane 番号（0 始まり）を割り当て、使用レーン数を返す。
 * セグメントは startCol 昇順で処理する前提。呼び出し側でソート済みでなくても
 * 内部でソートするため順不同で渡してよい（結果の lane は入力オブジェクトに書き込む）。
 */
export function packLanes<T extends WeekSegment>(
  segments: T[]
): { laneCount: number; laned: (T & { lane: number })[] } {
  const sorted = [...segments].sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol);
  // laneEnds[lane] = そのレーンで最後に使った endCol
  const laneEnds: number[] = [];
  const laned = sorted.map((seg) => {
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] >= seg.startCol) lane++;
    laneEnds[lane] = seg.endCol;
    return Object.assign({}, seg, { lane });
  });
  return { laneCount: laneEnds.length, laned };
}

/**
 * inclusive な期間 [startIdx, endIdx] を週 [weekStartIdx, weekStartIdx+6] にクリップする。
 * 週と重ならなければ null。重なれば週内の列（0..6, inclusive）を返す。
 */
export function clipToWeek(
  startIdx: number,
  endIdx: number,
  weekStartIdx: number
): { startCol: number; endCol: number } | null {
  const weekEndIdx = weekStartIdx + 6;
  if (endIdx < weekStartIdx || startIdx > weekEndIdx) return null;
  return {
    startCol: Math.max(startIdx, weekStartIdx) - weekStartIdx,
    endCol: Math.min(endIdx, weekEndIdx) - weekStartIdx,
  };
}
