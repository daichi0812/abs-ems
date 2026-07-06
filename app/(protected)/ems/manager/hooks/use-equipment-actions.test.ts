import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { managerAuthHeaders } from "@/lib/manager-auth";
import { useEquipmentActions } from "./use-equipment-actions";

const refetchEquipments = vi.fn(async () => {});
const fetchMock = vi.fn();

beforeEach(() => {
  pushMock.mockReset();
  refetchEquipments.mockClear();
  toastSuccess.mockReset();
  toastError.mockReset();
  fetchMock.mockReset();
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
  it("issues DELETE, refetches, and toasts success", async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useEquipmentActions({ refetchEquipments }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.deleteEquipment(42);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/lists/42", {
      method: "DELETE",
      headers: managerAuthHeaders(),
    });
    expect(refetchEquipments).toHaveBeenCalledOnce();
    expect(toastSuccess).toHaveBeenCalledWith("機材を削除しました");
    expect(ok).toBe(true);
  });

  it("toasts error and does not refetch on failure", async () => {
    fetchMock.mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useEquipmentActions({ refetchEquipments }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.deleteEquipment(7);
    });

    expect(refetchEquipments).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("機材の削除に失敗しました");
    expect(ok).toBe(false);
  });
});
