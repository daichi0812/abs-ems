// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findFirstMock,
  updateMock,
  deleteMock,
  reserveCountMock,
  reserveFindManyMock,
  reserveDeleteManyMock,
  transactionMock,
  membershipFindUniqueMock,
  currentUserMock,
  hasManagerAccessMock,
  notifyInBackgroundMock,
  notifyReservationCancelledMock,
} = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  reserveCountMock: vi.fn(),
  reserveFindManyMock: vi.fn(),
  reserveDeleteManyMock: vi.fn(),
  transactionMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  currentUserMock: vi.fn(),
  hasManagerAccessMock: vi.fn(),
  notifyInBackgroundMock: vi.fn(),
  notifyReservationCancelledMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    list: { findFirst: findFirstMock, update: updateMock, delete: deleteMock },
    reserve: {
      count: reserveCountMock,
      findMany: reserveFindManyMock,
      deleteMany: reserveDeleteManyMock,
    },
    membership: { findUnique: membershipFindUniqueMock },
    $transaction: transactionMock,
  },
}));
vi.mock("@/lib/notify", () => ({
  notifyInBackground: notifyInBackgroundMock,
  notifyReservationCancelled: (...a: unknown[]) => notifyReservationCancelledMock(...a),
}));
// GET はログイン必須。PUT/DELETE の hasManagerAccess 経由で currentRole も参照されうるため両方出す。
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
  currentRole: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({
  hasManagerAccess: () => hasManagerAccessMock(),
}));

import { DELETE, GET, PUT } from "./route";

const getRequest = () => new Request("http://localhost/api/lists/5");
const putRequest = (body: Record<string, unknown> = { name: "Camera" }) =>
  new Request("http://localhost/api/lists/5", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const deleteRequest = () => new Request("http://localhost/api/lists/5", { method: "DELETE" });
const params = { params: Promise.resolve({ equipmentId: "5" }) };

// update/delete が対象なしで投げる Prisma エラー（所有確認とレースした場合もここで 404 に落とす）
const p2025 = Object.assign(new Error("Record not found"), { code: "P2025" });

beforeEach(() => {
  findFirstMock.mockReset();
  // 既定は「現在のワークスペースが所有する機材」。越境ケースは各テストで null に上書きする
  findFirstMock.mockResolvedValue({ id: 5, name: "Camera" });
  updateMock.mockReset();
  deleteMock.mockReset();
  reserveCountMock.mockReset();
  reserveCountMock.mockResolvedValue(0);
  reserveFindManyMock.mockReset();
  reserveFindManyMock.mockResolvedValue([]);
  notifyInBackgroundMock.mockReset();
  notifyReservationCancelledMock.mockReset();
  reserveDeleteManyMock.mockReset();
  transactionMock.mockReset();
  // db.$transaction([...]) は各操作の Promise を解決した配列を返す想定
  transactionMock.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  membershipFindUniqueMock.mockReset();
  // requireWorkspaceMember が JWT の currentWorkspaceId を membership で再検証する
  membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
  hasManagerAccessMock.mockReset();
  hasManagerAccessMock.mockResolvedValue(true);
});

describe("GET /api/lists/[equipmentId]", () => {
  it("returns 401 and does not query when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await GET(getRequest(), params);

    expect(res.status).toBe(401);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("returns the equipment scoped to the current workspace", async () => {
    findFirstMock.mockResolvedValue({ id: 5, name: "Camera" });

    const res = await GET(getRequest(), params);

    expect(res.status).toBe(200);
    // 他ワークスペースの機材 id を指定しても引けない（workspaceId 条件を固定する）
    expect(findFirstMock).toHaveBeenCalledWith({ where: { id: 5, workspaceId: "ws1" } });
  });

  it("returns 404 when the equipment does not exist in the workspace", async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await GET(getRequest(), params);

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/lists/[equipmentId]", () => {
  it("verifies workspace ownership before updating", async () => {
    findFirstMock.mockResolvedValue({ id: 5 });
    updateMock.mockResolvedValue({ id: 5, name: "Camera" });

    const res = await PUT(putRequest(), params);

    expect(res.status).toBe(200);
    // update の where に複合条件は使えないため、所有確認→update の2段で越境更新を防ぐ
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: 5, workspaceId: "ws1" },
      select: { id: true },
    });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } }),
    );
  });

  it("returns 404 and does not update equipment of another workspace", async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await PUT(putRequest(), params);

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("maps P2025 (record not found) to 404", async () => {
    updateMock.mockRejectedValue(p2025);

    const res = await PUT(putRequest(), params);

    expect(res.status).toBe(404);
  });

  it("returns 403 without manager access", async () => {
    hasManagerAccessMock.mockResolvedValue(false);

    const res = await PUT(putRequest(), params);

    expect(res.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/lists/[equipmentId]", () => {
  it("deletes the equipment together with its reserves (orphan cleanup)", async () => {
    deleteMock.mockResolvedValue({ id: 5 });
    reserveDeleteManyMock.mockResolvedValue({ count: 2 });

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(200);
    // 所有確認と通知用の機材名取得を1回の findFirst で済ませる
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: 5, workspaceId: "ws1" },
      select: { id: true, name: true },
    });
    // 機材だけ消すと予約が孤児化（マイページに「#5」表示）するため、まとめて削除する
    expect(reserveDeleteManyMock).toHaveBeenCalledWith({ where: { list_id: 5 } });
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 and does not delete equipment of another workspace", async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(404);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns 409 and does not delete while the equipment is on loan (isRenting 2/3)", async () => {
    reserveCountMock.mockResolvedValue(1);

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(409);
    expect(reserveCountMock).toHaveBeenCalledWith({
      where: { list_id: 5, isRenting: { in: [2, 3] } },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("maps P2025 (record not found) to 404", async () => {
    deleteMock.mockRejectedValue(p2025);

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(404);
  });

  it("notifies owners of upcoming reserves that get cancelled by the deletion", async () => {
    // 単発キャンセル（DELETE /api/reserves/[id]）と同じ「管理者による取り消しは
    // 持ち主へ通知する」ポリシーを、機材削除経由の一括取り消しにも適用する
    deleteMock.mockResolvedValue({ id: 5 });
    reserveDeleteManyMock.mockResolvedValue({ count: 2 });
    const upcoming = [
      { id: 100, user_id: "u1", list_id: 5, start: new Date(), end: new Date() },
      { id: 101, user_id: "u2", list_id: 5, start: new Date(), end: new Date() },
    ];
    reserveFindManyMock.mockResolvedValue(upcoming);

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(200);
    // 機材名は所有確認の findFirst で List 行が消える前に控えたものを渡す（削除後は引けない）
    expect(notifyReservationCancelledMock).toHaveBeenCalledTimes(2);
    expect(notifyReservationCancelledMock).toHaveBeenCalledWith(upcoming[0], "Camera");
    expect(notifyReservationCancelledMock).toHaveBeenCalledWith(upcoming[1], "Camera");
    expect(notifyInBackgroundMock).toHaveBeenCalledTimes(2);
  });

  it("does not notify when there are no upcoming reserves", async () => {
    deleteMock.mockResolvedValue({ id: 5 });
    reserveDeleteManyMock.mockResolvedValue({ count: 0 });

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(200);
    expect(notifyReservationCancelledMock).not.toHaveBeenCalled();
  });
});
