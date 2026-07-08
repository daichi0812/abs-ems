// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  updateManyMock,
  membershipFindUniqueMock,
  currentUserMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  updateManyMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

// route-helpers 経由で @/lib/auth（next-auth）が読み込まれるのを避ける。
// PATCH は requireWorkspaceManager を使うため、所属メンバーとして通す currentUser を返す。
vi.mock("@/lib/auth", () => ({ currentUser: () => currentUserMock() }));

vi.mock("@/lib/db", () => ({
  db: {
    tag: { updateMany: (...a: unknown[]) => updateManyMock(...a) },
    membership: { findUnique: membershipFindUniqueMock },
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
  transactionMock.mockReset();
  updateManyMock.mockReset();
  updateManyMock.mockImplementation((args) => args); // 返り値は transaction 配列の中身用
  transactionMock.mockResolvedValue([]);
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
  membershipFindUniqueMock.mockReset();
  // requireWorkspaceMember が JWT の currentWorkspaceId を membership で再検証する。
  // 管理ルートなので既定は ADMIN（一般部員のケースは各テストで MEMBER に上書き）。
  membershipFindUniqueMock.mockResolvedValue({ role: "ADMIN" });
});

describe("PATCH /api/tags/reorder", () => {
  it("returns 403 for a workspace MEMBER (managers only)", async () => {
    // 権限は membership.role（OWNER/ADMIN）一本。一般部員は並び替えできない。
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });

    const res = await PATCH(makeReq({ orderedIds: [1, 2] }));

    expect(res.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when orderedIds is not a numeric array", async () => {
    const res = await PATCH(makeReq({ orderedIds: ["a", "b"] }));

    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("assigns sortOrder by array position in a transaction", async () => {
    const res = await PATCH(makeReq({ orderedIds: [3, 1, 2] }));

    expect(res.status).toBe(200);
    // updateMany + workspaceId 条件で、他ワークスペースのカテゴリ id が混ざっていても無視される
    expect(updateManyMock).toHaveBeenNthCalledWith(1, {
      where: { id: 3, workspaceId: "ws1" },
      data: { sortOrder: 0 },
    });
    expect(updateManyMock).toHaveBeenNthCalledWith(2, {
      where: { id: 1, workspaceId: "ws1" },
      data: { sortOrder: 1 },
    });
    expect(updateManyMock).toHaveBeenNthCalledWith(3, {
      where: { id: 2, workspaceId: "ws1" },
      data: { sortOrder: 2 },
    });
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});
