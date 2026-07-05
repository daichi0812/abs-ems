import { describe, it, expect } from "vitest";
import { clipToWeek, packLanes } from "./lane-packing";

describe("clipToWeek", () => {
  const wk = 100; // 週の開始 day index（列0..6 = 100..106）

  it("週内に完全に収まる", () => {
    expect(clipToWeek(102, 104, wk)).toEqual({ startCol: 2, endCol: 4 });
  });
  it("左にはみ出す（前週から継続）", () => {
    expect(clipToWeek(97, 103, wk)).toEqual({ startCol: 0, endCol: 3 });
  });
  it("右にはみ出す（翌週へ継続）", () => {
    expect(clipToWeek(104, 110, wk)).toEqual({ startCol: 4, endCol: 6 });
  });
  it("週全体を覆う", () => {
    expect(clipToWeek(90, 120, wk)).toEqual({ startCol: 0, endCol: 6 });
  });
  it("週より前は null", () => {
    expect(clipToWeek(90, 99, wk)).toBeNull();
  });
  it("週より後は null", () => {
    expect(clipToWeek(107, 110, wk)).toBeNull();
  });
  it("端の単日（週末最終日）", () => {
    expect(clipToWeek(106, 106, wk)).toEqual({ startCol: 6, endCol: 6 });
  });
});

describe("packLanes", () => {
  it("重ならないセグメントは同じレーン0を共有", () => {
    const { laneCount, laned } = packLanes([
      { startCol: 0, endCol: 1 },
      { startCol: 3, endCol: 4 },
    ]);
    expect(laneCount).toBe(1);
    expect(laned.map((s) => s.lane)).toEqual([0, 0]);
  });

  it("重なるセグメントは別レーン", () => {
    const { laneCount, laned } = packLanes([
      { startCol: 0, endCol: 3 },
      { startCol: 2, endCol: 5 },
    ]);
    expect(laneCount).toBe(2);
    expect(laned.map((s) => s.lane).sort()).toEqual([0, 1]);
  });

  it("隣接（endCol == 次の startCol）は重なり扱いで別レーン", () => {
    const { laneCount } = packLanes([
      { startCol: 0, endCol: 2 },
      { startCol: 2, endCol: 4 },
    ]);
    expect(laneCount).toBe(2);
  });

  it("入力順に依存せず startCol でソートして割り当てる", () => {
    const { laned } = packLanes([
      { startCol: 4, endCol: 6, id: "b" },
      { startCol: 0, endCol: 2, id: "a" },
    ]);
    // 出力は startCol 昇順、両者は重ならないので lane0 を共有
    expect(laned.map((s) => s.id)).toEqual(["a", "b"]);
    expect(laned.every((s) => s.lane === 0)).toBe(true);
  });

  it("3本のうち2本が重なると2レーン", () => {
    const { laneCount } = packLanes([
      { startCol: 0, endCol: 6 },
      { startCol: 0, endCol: 1 },
      { startCol: 3, endCol: 4 },
    ]);
    expect(laneCount).toBe(2);
  });
});
