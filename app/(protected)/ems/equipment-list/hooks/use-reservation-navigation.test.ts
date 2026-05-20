import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { useReservationNavigation } from "./use-reservation-navigation";

beforeEach(() => {
  pushMock.mockReset();
});

describe("useReservationNavigation", () => {
  it("starts with loadingId=null", () => {
    const { result } = renderHook(() => useReservationNavigation());
    expect(result.current.loadingId).toBeNull();
  });

  it("sets loadingId and calls router.push with the equipment id", () => {
    const { result } = renderHook(() => useReservationNavigation());

    act(() => {
      result.current.navigateToReserve(42);
    });

    expect(result.current.loadingId).toBe(42);
    expect(pushMock).toHaveBeenCalledWith("/ems/reserve/42");
  });

  it("tracks the most recent navigation id", () => {
    const { result } = renderHook(() => useReservationNavigation());

    act(() => {
      result.current.navigateToReserve(1);
    });
    act(() => {
      result.current.navigateToReserve(2);
    });

    expect(result.current.loadingId).toBe(2);
    expect(pushMock).toHaveBeenNthCalledWith(1, "/ems/reserve/1");
    expect(pushMock).toHaveBeenNthCalledWith(2, "/ems/reserve/2");
  });
});
