// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteManyMock,
  updateManyMock,
  findManyMock,
  findFirstMock,
  membershipFindUniqueMock,
  currentUserMock,
} = vi.hoisted(() => ({
  deleteManyMock: vi.fn(),
  updateManyMock: vi.fn(),
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    reserve: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      deleteMany: deleteManyMock,
      updateMany: updateManyMock,
    },
    membership: { findUnique: membershipFindUniqueMock },
  },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

// 通知はバックグラウンド副作用なので、ルートの契約テストでは無効化する。
vi.mock("@/lib/notify", () => ({
  notifyInBackground: vi.fn(),
  notifyReservationCancelled: vi.fn(),
}));

import { DELETE, GET, PATCH } from "./route";

const deleteRequest = () =>
  new Request("http://localhost/api/reserves/5", { method: "DELETE" });
const getRequest = () => new Request("http://localhost/api/reserves/5");
const patchRequest = (body: unknown) =>
  new Request("http://localhost/api/reserves/5", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const params = { params: Promise.resolve({ reserveId: "5" }) };

beforeEach(() => {
  deleteManyMock.mockReset();
  updateManyMock.mockReset();
  findManyMock.mockReset();
  findFirstMock.mockReset();
  currentUserMock.mockReset();
  // 既定はワークスペース所属あり（MEMBER）。所属なしは各テストで上書き。
  membershipFindUniqueMock.mockReset();
  membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });
});

describe("GET /api/reserves/[reserveId]", () => {
  it("returns 401 and does not query when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await GET(getRequest(), params);

    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 403 and does not query when not a workspace member", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    membershipFindUniqueMock.mockResolvedValue(null);

    const res = await GET(getRequest(), params);

    expect(res.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns the reserve for an authenticated user", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    findManyMock.mockResolvedValue([{ id: 5 }]);

    const res = await GET(getRequest(), params);

    expect(res.status).toBe(200);
    // 常にワークスペースでスコープし、他団体の予約は返さない。
    expect(findManyMock).toHaveBeenCalledWith({
      where: { id: 5, workspaceId: "ws1" },
    });
  });
});

describe("PATCH /api/reserves/[reserveId]", () => {
  it("returns 401 when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await PATCH(patchRequest({ isRenting: 2 }), params);

    expect(res.status).toBe(401);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a transition other than borrow(2) / return(4)", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });

    for (const isRenting of [0, 1, 3, "2", undefined]) {
      const res = await PATCH(patchRequest({ isRenting }), params);
      expect(res.status).toBe(400);
    }
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("borrows only the user's own reserve within the rental period", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    updateManyMock.mockResolvedValue({ count: 1 });

    const res = await PATCH(patchRequest({ isRenting: 2 }), params);

    expect(res.status).toBe(200);
    const where = updateManyMock.mock.calls[0][0].where;
    expect(where).toMatchObject({
      id: 5,
      workspaceId: "ws1",
      user_id: "u1",
      isRenting: { in: [0, 1] },
    });
    // 期間内チェック（start <= 今日(JST) <= end）が where に含まれる
    expect(where.start.lte).toBeInstanceOf(Date);
    expect(where.end.gte).toBeInstanceOf(Date);
    expect(updateManyMock.mock.calls[0][0].data).toEqual({ isRenting: 2 });
  });

  it("returns 409 when borrow matched nothing but the reserve exists (out of period / already rented)", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    updateManyMock.mockResolvedValue({ count: 0 });
    findFirstMock.mockResolvedValue({ id: 5, isRenting: 2 });

    const res = await PATCH(patchRequest({ isRenting: 2 }), params);

    expect(res.status).toBe(409);
  });

  it("returns 404 when the reserve is missing or someone else's", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    updateManyMock.mockResolvedValue({ count: 0 });
    findFirstMock.mockResolvedValue(null);

    const res = await PATCH(patchRequest({ isRenting: 2 }), params);

    expect(res.status).toBe(404);
  });

  it("returns a rented reserve (2|3 -> 4) without a period restriction", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    updateManyMock.mockResolvedValue({ count: 1 });

    const res = await PATCH(patchRequest({ isRenting: 4 }), params);

    expect(res.status).toBe(200);
    // end は書き換えず、実際に返した日を returnedAt に記録する（早期返却の履歴用）
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: 5, workspaceId: "ws1", user_id: "u1", isRenting: { in: [2, 3] } },
      data: { isRenting: 4, returnedAt: expect.any(Date) },
    });
  });

  it("lets a workspace ADMIN transition any reserve in the workspace", async () => {
    // 権限は membership.role（OWNER/ADMIN）一本。グローバル role は USER のままでよい。
    currentUserMock.mockResolvedValue({ id: "admin1", role: "USER", currentWorkspaceId: "ws1" });
    membershipFindUniqueMock.mockResolvedValue({ role: "ADMIN" });
    updateManyMock.mockResolvedValue({ count: 1 });

    const res = await PATCH(patchRequest({ isRenting: 4 }), params);

    expect(res.status).toBe(200);
    // 管理者は user_id スコープなし。ただしワークスペース内に限る。
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: 5, workspaceId: "ws1", isRenting: { in: [2, 3] } },
      data: { isRenting: 4, returnedAt: expect.any(Date) },
    });
  });

  it("scopes a global ADMIN who is only a workspace MEMBER to their own reserves", async () => {
    // グローバル UserRole.ADMIN は予約操作の権限に使わない（workspaceRole 一本化）。
    currentUserMock.mockResolvedValue({ id: "u1", role: "ADMIN", currentWorkspaceId: "ws1" });
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });
    updateManyMock.mockResolvedValue({ count: 1 });

    const res = await PATCH(patchRequest({ isRenting: 4 }), params);

    expect(res.status).toBe(200);
    // user_id スコープが残る＝他人の予約には届かない
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: 5, workspaceId: "ws1", user_id: "u1", isRenting: { in: [2, 3] } },
      data: { isRenting: 4, returnedAt: expect.any(Date) },
    });
  });
});

describe("DELETE /api/reserves/[reserveId]", () => {
  it("returns 401 when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(401);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("scopes deletion to the user's own un-rented (0|1) reserves in the workspace", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    // 削除前の対象控え（通知用）はワークスペース内でのみ探す
    findFirstMock.mockResolvedValue({ id: 5, user_id: "u1" });
    deleteManyMock.mockResolvedValue({ count: 1 });

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(200);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: 5, workspaceId: "ws1" },
    });
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: 5, workspaceId: "ws1", user_id: "u1", isRenting: { in: [0, 1] } },
    });
  });

  it("lets a workspace ADMIN delete any reserve in the workspace", async () => {
    // 権限は membership.role（OWNER/ADMIN）一本。グローバル role は USER のままでよい。
    currentUserMock.mockResolvedValue({ id: "admin1", role: "USER", currentWorkspaceId: "ws1" });
    membershipFindUniqueMock.mockResolvedValue({ role: "ADMIN" });
    findFirstMock.mockResolvedValue({ id: 5, user_id: "u1" });
    deleteManyMock.mockResolvedValue({ count: 1 });

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(200);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: 5, workspaceId: "ws1" },
    });
  });

  it("scopes a global ADMIN who is only a workspace MEMBER to their own reserves", async () => {
    // グローバル UserRole.ADMIN でも workspaceRole が MEMBER なら他人の予約は消せない。
    currentUserMock.mockResolvedValue({ id: "u1", role: "ADMIN", currentWorkspaceId: "ws1" });
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });
    findFirstMock.mockResolvedValue({ id: 5, user_id: "u1" });
    deleteManyMock.mockResolvedValue({ count: 1 });

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(200);
    // user_id スコープと未貸出(0|1)の制限が残る＝一般部員と同じ扱い
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: 5, workspaceId: "ws1", user_id: "u1", isRenting: { in: [0, 1] } },
    });
  });

  it("returns 409 when the reserve exists but is rented or already returned", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    deleteManyMock.mockResolvedValue({ count: 0 });
    findFirstMock.mockResolvedValue({ id: 5, isRenting: 2 });

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("貸出中・返却済みの予約は削除できません。");
  });

  it("returns 404 when nothing was deleted (missing or someone else's reserve)", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    deleteManyMock.mockResolvedValue({ count: 0 });
    findFirstMock.mockResolvedValue(null);

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("予約が見つかりません。");
  });

  it("returns 400 for a non-numeric id", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });

    const res = await DELETE(deleteRequest(), {
      params: Promise.resolve({ reserveId: "abc" }),
    });

    expect(res.status).toBe(400);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });
});
