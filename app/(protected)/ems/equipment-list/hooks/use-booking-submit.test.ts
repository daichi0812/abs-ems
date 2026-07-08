import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a) },
}));

const createReservations = vi.fn();
vi.mock("@/app/(protected)/ems/equipment-list/hooks/use-create-reservations", () => ({
  useCreateReservations: () => ({ isSubmitting: false, createReservations }),
}));

import { useBookingSubmit } from "./use-booking-submit";
import type { CreateResult } from "./use-create-reservations";

const refetchReserves = vi.fn(async () => {});
const setDone = vi.fn();
const setCart = vi.fn();
const equipmentName = (id: number) => `E${id}`;

const render = (cart: number[]) =>
  renderHook(() =>
    useBookingSubmit({
      cart,
      startStr: "2026-07-10",
      endStr: "2026-07-12",
      equipmentName,
      refetchReserves,
      setDone,
      setCart,
    })
  );

beforeEach(() => {
  createReservations.mockReset();
  refetchReserves.mockClear();
  setDone.mockReset();
  setCart.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useBookingSubmit", () => {
  it("カートが空なら何もしない（POST しない）", async () => {
    const { result } = render([]);
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createReservations).not.toHaveBeenCalled();
    expect(setDone).not.toHaveBeenCalled();
    expect(refetchReserves).not.toHaveBeenCalled();
  });

  it("全件成功: 完了画面へ進め、refetch を待たずに走らせ、トーストは出さない", async () => {
    createReservations.mockResolvedValue({
      ok: true,
      conflict: false,
      createdCount: 2,
      createdIds: [1, 2],
      conflictIds: [],
    } satisfies CreateResult);

    const { result } = render([1, 2]);
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createReservations).toHaveBeenCalledWith([1, 2], "2026-07-10", "2026-07-12");
    expect(setDone).toHaveBeenCalledWith(true);
    expect(refetchReserves).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("部分成功（競合あり）: 成功分をカートから外し、競合機材名を含む1本のトーストを出す", async () => {
    createReservations.mockResolvedValue({
      ok: false,
      conflict: true,
      createdCount: 1,
      createdIds: [1],
      conflictIds: [2],
    } satisfies CreateResult);

    const { result } = render([1, 2]);
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(refetchReserves).toHaveBeenCalledTimes(1);
    expect(setDone).not.toHaveBeenCalled();
    // 成功した機材 (id=1) をカートから外す
    expect(setCart).toHaveBeenCalledTimes(1);
    const updater = setCart.mock.calls[0][0] as (prev: number[]) => number[];
    expect(updater([1, 2])).toEqual([2]);
    expect(toastError).toHaveBeenCalledTimes(1);
    const [message, opts] = toastError.mock.calls[0];
    expect(message).toContain("E2");
    expect(message).toContain("それ以外の1件は予約済み");
    expect(opts).toEqual({ duration: 10000 });
  });

  it("部分成功（競合なし・その他エラー）: 件数とAPIメッセージを添えたトーストを出す", async () => {
    createReservations.mockResolvedValue({
      ok: false,
      conflict: false,
      createdCount: 1,
      createdIds: [1],
      conflictIds: [],
      errorMessage: "サーバーエラー",
    } satisfies CreateResult);

    const { result } = render([1, 2]);
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(setCart).toHaveBeenCalledTimes(1);
    const [message, opts] = toastError.mock.calls[0];
    expect(message).toContain("一部の機材が予約できませんでした（1件は予約済み");
    expect(message).toContain("サーバーエラー");
    expect(opts).toEqual({ duration: 10000 });
  });

  it("全件競合: 期間変更を促すトーストを出す（カートは維持）", async () => {
    createReservations.mockResolvedValue({
      ok: false,
      conflict: true,
      createdCount: 0,
      createdIds: [],
      conflictIds: [1, 2],
    } satisfies CreateResult);

    const { result } = render([1, 2]);
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(refetchReserves).toHaveBeenCalledTimes(1);
    expect(setCart).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(
      "E1、E2 は選択した期間にすでに予約が入っています。期間を変更してください。"
    );
  });

  it("その他の失敗: API のエラーメッセージをそのまま出す", async () => {
    createReservations.mockResolvedValue({
      ok: false,
      conflict: false,
      createdCount: 0,
      createdIds: [],
      conflictIds: [],
      errorMessage: "予約開始日は今日以降にしてください。",
    } satisfies CreateResult);

    const { result } = render([1]);
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(toastError).toHaveBeenCalledWith("予約開始日は今日以降にしてください。");
  });

  it("その他の失敗でメッセージが無いときは既定文言を出す", async () => {
    createReservations.mockResolvedValue({
      ok: false,
      conflict: false,
      createdCount: 0,
      createdIds: [],
      conflictIds: [],
    } satisfies CreateResult);

    const { result } = render([1]);
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(toastError).toHaveBeenCalledWith("予約の作成中にエラーが発生しました。");
  });
});
