// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findFirstMock,
  txFindFirstMock,
  txUpdateManyMock,
  currentUserMock,
  notifyInBackgroundMock,
  notifyReservationExtendedMock,
} = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  txFindFirstMock: vi.fn(),
  txUpdateManyMock: vi.fn(),
  currentUserMock: vi.fn(),
  notifyInBackgroundMock: vi.fn(),
  notifyReservationExtendedMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    reserve: { findFirst: findFirstMock },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ reserve: { findFirst: txFindFirstMock, updateMany: txUpdateManyMock } }),
    ),
  },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));
vi.mock("@/lib/notify", () => ({
  notifyInBackground: notifyInBackgroundMock,
  notifyReservationExtended: (...a: unknown[]) => notifyReservationExtendedMock(...a),
}));

import { PATCH } from "./route";

const patchRequest = (body: unknown) =>
  new Request("http://localhost/api/reserves/5/extend", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const params = { params: Promise.resolve({ reserveId: "5" }) };

// バリデーションは JST の「今日」基準なので、期待値も同じ式で計算して TZ 非依存にする
const jstDate = (offsetDays: number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));

const asUtc = (d: string) => new Date(`${d}T00:00:00Z`);

// 既定の対象: 本人(u1)が貸出中(2)、昨日〜明日の予約
const baseReserve = () => ({
  id: 5,
  user_id: "u1",
  list_id: 7,
  start: asUtc(jstDate(-1)),
  end: asUtc(jstDate(1)),
  isRenting: 2,
  remindedOn: null,
  returnedAt: null,
});

beforeEach(() => {
  findFirstMock.mockReset();
  txFindFirstMock.mockReset();
  txFindFirstMock.mockResolvedValue(null);
  txUpdateManyMock.mockReset();
  txUpdateManyMock.mockResolvedValue({ count: 1 });
  notifyInBackgroundMock.mockReset();
  notifyReservationExtendedMock.mockReset();
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "u1", role: "USER" });
});

describe("PATCH /api/reserves/[reserveId]/extend", () => {
  it("returns 401 when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await PATCH(patchRequest({ end: jstDate(3) }), params);

    expect(res.status).toBe(401);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await PATCH(patchRequest({ end: jstDate(3) }), {
      params: Promise.resolve({ reserveId: "abc" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when end is missing or not a string", async () => {
    for (const body of [{}, { end: 123 }, null]) {
      const res = await PATCH(patchRequest(body), params);
      expect(res.status).toBe(400);
    }
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed or calendar-invalid date", async () => {
    for (const end of ["not-a-date", "2026/07/10", "2026-02-30", "2026-13-01"]) {
      const res = await PATCH(patchRequest({ end }), params);
      expect(res.status).toBe(400);
    }
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the reserve is missing or someone else's (owner scope)", async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await PATCH(patchRequest({ end: jstDate(3) }), params);

    expect(res.status).toBe(404);
    // 所有権は where で強制（他人の予約は見つからない扱い）
    expect(findFirstMock).toHaveBeenCalledWith({ where: { id: 5, user_id: "u1" } });
    expect(txUpdateManyMock).not.toHaveBeenCalled();
  });

  it("returns 409 for an already-returned reserve (isRenting=4)", async () => {
    findFirstMock.mockResolvedValue({ ...baseReserve(), isRenting: 4 });

    const res = await PATCH(patchRequest({ end: jstDate(3) }), params);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("返却済みの予約は延長できません。");
    expect(txUpdateManyMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the new end is not after the current end (shrink is not supported)", async () => {
    findFirstMock.mockResolvedValue(baseReserve());

    for (const end of [jstDate(1), jstDate(0)]) {
      const res = await PATCH(patchRequest({ end }), params);
      expect(res.status).toBe(400);
    }
    expect(txUpdateManyMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the new end is in the past (overdue reserve extended to another past day)", async () => {
    findFirstMock.mockResolvedValue({
      ...baseReserve(),
      start: asUtc(jstDate(-10)),
      end: asUtc(jstDate(-5)),
    });

    const res = await PATCH(patchRequest({ end: jstDate(-2) }), params);

    expect(res.status).toBe(400);
    expect(txUpdateManyMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the extended period overlaps another reserve", async () => {
    findFirstMock.mockResolvedValue(baseReserve());
    txFindFirstMock.mockResolvedValue({ id: 99 });

    const res = await PATCH(patchRequest({ end: jstDate(3) }), params);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("この期間にはすでに予約が入っています。");
    expect(txUpdateManyMock).not.toHaveBeenCalled();
    // 自分自身は除外し、返却済(4)は空き扱いで判定する
    expect(txFindFirstMock).toHaveBeenCalledWith({
      where: {
        list_id: 7,
        id: { not: 5 },
        isRenting: { not: 4 },
        start: { lte: asUtc(jstDate(3)) },
        end: { gte: asUtc(jstDate(-1)) },
      },
    });
  });

  it("extends the reserve and resets remindedOn so the reminder fires again on the new end", async () => {
    findFirstMock.mockResolvedValue(baseReserve());

    const res = await PATCH(patchRequest({ end: jstDate(3) }), params);

    expect(res.status).toBe(200);
    expect(txUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 5, user_id: "u1", isRenting: { in: [0, 1, 2, 3] } },
      data: { end: asUtc(jstDate(3)), remindedOn: null },
    });
    // 本人の操作なので通知はしない
    expect(notifyReservationExtendedMock).not.toHaveBeenCalled();
  });

  it("lets an overdue (isRenting=3 or past-end) reserve be extended to a future date", async () => {
    findFirstMock.mockResolvedValue({
      ...baseReserve(),
      start: asUtc(jstDate(-10)),
      end: asUtc(jstDate(-3)),
      isRenting: 3,
    });

    const res = await PATCH(patchRequest({ end: jstDate(2) }), params);

    expect(res.status).toBe(200);
  });

  it("returns 409 when nothing was updated (state changed between fetch and update)", async () => {
    findFirstMock.mockResolvedValue(baseReserve());
    txUpdateManyMock.mockResolvedValue({ count: 0 });

    const res = await PATCH(patchRequest({ end: jstDate(3) }), params);

    expect(res.status).toBe(409);
  });

  it("lets an ADMIN extend any reserve and notifies the owner", async () => {
    currentUserMock.mockResolvedValue({ id: "admin1", role: "ADMIN" });
    findFirstMock.mockResolvedValue(baseReserve());

    const res = await PATCH(patchRequest({ end: jstDate(3) }), params);

    expect(res.status).toBe(200);
    // ADMIN は owner scope なし
    expect(findFirstMock).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(txUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 5, isRenting: { in: [0, 1, 2, 3] } },
      data: { end: asUtc(jstDate(3)), remindedOn: null },
    });
    // 他人の予約を延長したので持ち主へ通知（延長後の end を渡す）
    expect(notifyReservationExtendedMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", end: asUtc(jstDate(3)) }),
    );
    expect(notifyInBackgroundMock).toHaveBeenCalledTimes(1);
  });
});
