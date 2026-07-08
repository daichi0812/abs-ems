import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMonthNav } from "./use-month-nav";

beforeEach(() => {
  vi.useFakeTimers();
  // 2026-06-15 を「今日」として固定する。
  vi.setSystemTime(new Date(2026, 5, 15));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useMonthNav", () => {
  it("今日を含む月で初期化される", () => {
    const { result } = renderHook(() => useMonthNav());
    expect(result.current.viewYear).toBe(2026);
    expect(result.current.viewMonth0).toBe(5);
    expect(result.current.isCurrentMonth).toBe(true);
  });

  it("翌月へ進める", () => {
    const { result } = renderHook(() => useMonthNav());
    act(() => result.current.goNextMonth());
    expect(result.current.viewMonth0).toBe(6);
    expect(result.current.viewYear).toBe(2026);
    expect(result.current.isCurrentMonth).toBe(false);
  });

  it("前月へ戻れる", () => {
    const { result } = renderHook(() => useMonthNav());
    act(() => result.current.goPrevMonth());
    expect(result.current.viewMonth0).toBe(4);
    expect(result.current.viewYear).toBe(2026);
  });

  it("12月→翌月で年が繰り上がる", () => {
    const { result } = renderHook(() => useMonthNav());
    // 6月 → 12月まで進める
    for (let i = 0; i < 6; i++) act(() => result.current.goNextMonth());
    expect(result.current.viewMonth0).toBe(11);
    expect(result.current.viewYear).toBe(2026);
    act(() => result.current.goNextMonth());
    expect(result.current.viewMonth0).toBe(0);
    expect(result.current.viewYear).toBe(2027);
  });

  it("1月→前月で年が繰り下がる", () => {
    const { result } = renderHook(() => useMonthNav());
    for (let i = 0; i < 5; i++) act(() => result.current.goPrevMonth());
    expect(result.current.viewMonth0).toBe(0);
    expect(result.current.viewYear).toBe(2026);
    act(() => result.current.goPrevMonth());
    expect(result.current.viewMonth0).toBe(11);
    expect(result.current.viewYear).toBe(2025);
  });

  it("goToday で今月へ戻る", () => {
    const { result } = renderHook(() => useMonthNav());
    act(() => result.current.goNextMonth());
    act(() => result.current.goNextMonth());
    expect(result.current.isCurrentMonth).toBe(false);
    act(() => result.current.goToday());
    expect(result.current.viewYear).toBe(2026);
    expect(result.current.viewMonth0).toBe(5);
    expect(result.current.isCurrentMonth).toBe(true);
  });

  it("月を移動するたびに onChange が呼ばれる", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useMonthNav(onChange));
    act(() => result.current.goNextMonth());
    act(() => result.current.goPrevMonth());
    act(() => result.current.goToday());
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
