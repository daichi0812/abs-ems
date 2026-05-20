import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { useEquipmentActions } from "./use-equipment-actions";

const refetchEquipments = vi.fn(async () => {});
const confirmMock = vi.fn();
const fetchMock = vi.fn();

beforeEach(() => {
  pushMock.mockReset();
  refetchEquipments.mockClear();
  confirmMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("confirm", confirmMock);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useEquipmentActions - edit", () => {
  it("sets loadingId and navigates to edit page", () => {
    const { result } = renderHook(() => useEquipmentActions({ refetchEquipments }));

    act(() => {
      result.current.editEquipment(42);
    });

    expect(result.current.loadingId).toBe(42);
    expect(pushMock).toHaveBeenCalledWith("/ems/edit/42");
  });

  it("tracks the most recent edit id", () => {
    const { result } = renderHook(() => useEquipmentActions({ refetchEquipments }));

    act(() => {
      result.current.editEquipment(1);
    });
    act(() => {
      result.current.editEquipment(2);
    });

    expect(result.current.loadingId).toBe(2);
  });
});

describe("useEquipmentActions - delete", () => {
  it("does not call fetch or refetch when confirm is cancelled", async () => {
    confirmMock.mockReturnValue(false);

    const { result } = renderHook(() => useEquipmentActions({ refetchEquipments }));

    await act(async () => {
      await result.current.deleteEquipment(42);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(refetchEquipments).not.toHaveBeenCalled();
  });

  it("issues DELETE and refetches when confirmed", async () => {
    confirmMock.mockReturnValue(true);
    fetchMock.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useEquipmentActions({ refetchEquipments }));

    await act(async () => {
      await result.current.deleteEquipment(42);
    });

    expect(confirmMock).toHaveBeenCalledWith("本当に削除しますか？");
    expect(fetchMock).toHaveBeenCalledWith("/api/lists/42", { method: "DELETE" });
    expect(refetchEquipments).toHaveBeenCalledOnce();
  });
});
