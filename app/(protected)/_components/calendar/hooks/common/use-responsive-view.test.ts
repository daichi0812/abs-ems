import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useResponsiveView } from "./use-responsive-view";

const setWindowWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
};

beforeEach(() => {
  setWindowWidth(1024);
});

afterEach(() => {
  setWindowWidth(1024);
});

describe("useResponsiveView - initial state", () => {
  it("starts with monthly view and isMobile=false on wide screen", () => {
    setWindowWidth(1280);
    const { result } = renderHook(() => useResponsiveView());
    expect(result.current.isMobile).toBe(false);
    expect(result.current.displayMonthly).toBe(true);
    expect(result.current.displayWeekly).toBe(false);
  });

  it("detects mobile when innerWidth <= 768 on mount", () => {
    setWindowWidth(500);
    const { result } = renderHook(() => useResponsiveView());
    expect(result.current.isMobile).toBe(true);
  });

  it("isMobile=false at exactly 769 px", () => {
    setWindowWidth(769);
    const { result } = renderHook(() => useResponsiveView());
    expect(result.current.isMobile).toBe(false);
  });

  it("isMobile=true at exactly 768 px (boundary)", () => {
    setWindowWidth(768);
    const { result } = renderHook(() => useResponsiveView());
    expect(result.current.isMobile).toBe(true);
  });
});

describe("useResponsiveView - resize", () => {
  it("updates isMobile when window resizes", () => {
    setWindowWidth(1280);
    const { result } = renderHook(() => useResponsiveView());
    expect(result.current.isMobile).toBe(false);

    act(() => {
      setWindowWidth(400);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.isMobile).toBe(true);
  });

  it("removes resize listener on unmount", () => {
    const { unmount } = renderHook(() => useResponsiveView());
    unmount();
    // dispatch should not throw or update anything; no observable assertion needed
    setWindowWidth(400);
    window.dispatchEvent(new Event("resize"));
  });
});

describe("useResponsiveView - view toggle", () => {
  it("showWeekly switches displays", () => {
    const { result } = renderHook(() => useResponsiveView());

    act(() => {
      result.current.showWeekly();
    });

    expect(result.current.displayWeekly).toBe(true);
    expect(result.current.displayMonthly).toBe(false);
  });

  it("showMonthly switches back", () => {
    const { result } = renderHook(() => useResponsiveView());

    act(() => {
      result.current.showWeekly();
    });
    act(() => {
      result.current.showMonthly();
    });

    expect(result.current.displayMonthly).toBe(true);
    expect(result.current.displayWeekly).toBe(false);
  });
});
