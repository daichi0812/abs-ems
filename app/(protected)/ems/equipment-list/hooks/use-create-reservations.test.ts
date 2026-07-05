import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { useCreateReservations } from "./use-create-reservations";

vi.mock("axios");
const mockedPost = vi.mocked(axios.post);
// axios.isAxiosError はモックで失われるため、簡易実体に差し替える
(axios as unknown as { isAxiosError: (v: unknown) => boolean }).isAxiosError = (v) =>
  !!v && typeof v === "object" && "isAxiosError" in (v as object);

afterEach(() => {
  vi.clearAllMocks();
});

describe("useCreateReservations", () => {
  it("全件成功で ok=true", async () => {
    mockedPost.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useCreateReservations());

    let res: Awaited<ReturnType<typeof result.current.createReservations>> | undefined;
    await act(async () => {
      res = await result.current.createReservations([1, 2, 3], "2026-07-10", "2026-07-12");
    });

    expect(mockedPost).toHaveBeenCalledTimes(3);
    expect(mockedPost).toHaveBeenCalledWith("/api/reserves", {
      list_id: 1,
      start: "2026-07-10",
      end: "2026-07-12",
    });
    expect(res).toEqual({ ok: true, conflict: false, createdCount: 3 });
  });

  it("409 が混ざると conflict=true・ok=false", async () => {
    mockedPost
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } });
    const { result } = renderHook(() => useCreateReservations());

    let res: Awaited<ReturnType<typeof result.current.createReservations>> | undefined;
    await act(async () => {
      res = await result.current.createReservations([1, 2], "2026-07-10", "2026-07-12");
    });

    expect(res).toEqual({ ok: false, conflict: true, createdCount: 1 });
  });

  it("user_id は body に含めない（API がセッションから導出）", async () => {
    mockedPost.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useCreateReservations());

    await act(async () => {
      await result.current.createReservations([5], "2026-07-10", "2026-07-10");
    });

    expect(mockedPost).toHaveBeenCalledWith(
      "/api/reserves",
      expect.not.objectContaining({ user_id: expect.anything() })
    );
  });
});
