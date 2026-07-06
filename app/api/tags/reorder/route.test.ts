// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { hasManagerAccessMock, transactionMock, updateMock } = vi.hoisted(() => ({
  hasManagerAccessMock: vi.fn(),
  transactionMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  hasManagerAccess: (req: Request) => hasManagerAccessMock(req),
}));
// route-helpers 経由で @/lib/auth（next-auth）が読み込まれるのを避ける。PATCH は requireManager のみ使う。
vi.mock("@/lib/auth", () => ({ currentUser: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    tag: { update: (...a: unknown[]) => updateMock(...a) },
    $transaction: (...a: unknown[]) => transactionMock(...a),
  },
}));

import { PATCH } from "./route";

const makeReq = (body: unknown) =>
  new Request("http://localhost/api/tags/reorder", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  hasManagerAccessMock.mockReset();
  transactionMock.mockReset();
  updateMock.mockReset();
  updateMock.mockImplementation((args) => args); // 返り値は transaction 配列の中身用
  transactionMock.mockResolvedValue([]);
});

describe("PATCH /api/tags/reorder", () => {
  it("returns 403 without manager access", async () => {
    hasManagerAccessMock.mockResolvedValue(false);

    const res = await PATCH(makeReq({ orderedIds: [1, 2] }));

    expect(res.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when orderedIds is not a numeric array", async () => {
    hasManagerAccessMock.mockResolvedValue(true);

    const res = await PATCH(makeReq({ orderedIds: ["a", "b"] }));

    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("assigns sortOrder by array position in a transaction", async () => {
    hasManagerAccessMock.mockResolvedValue(true);

    const res = await PATCH(makeReq({ orderedIds: [3, 1, 2] }));

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenNthCalledWith(1, { where: { id: 3 }, data: { sortOrder: 0 } });
    expect(updateMock).toHaveBeenNthCalledWith(2, { where: { id: 1 }, data: { sortOrder: 1 } });
    expect(updateMock).toHaveBeenNthCalledWith(3, { where: { id: 2 }, data: { sortOrder: 2 } });
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});
