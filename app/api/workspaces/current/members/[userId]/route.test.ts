// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  membershipFindUniqueMock,
  membershipCountMock,
  membershipUpdateMock,
  membershipDeleteMock,
  userUpdateManyMock,
  currentUserMock,
} = vi.hoisted(() => ({
  membershipFindUniqueMock: vi.fn(),
  membershipCountMock: vi.fn(),
  membershipUpdateMock: vi.fn(),
  membershipDeleteMock: vi.fn(),
  userUpdateManyMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    membership: {
      findUnique: membershipFindUniqueMock,
      count: membershipCountMock,
      update: membershipUpdateMock,
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        membership: { delete: membershipDeleteMock },
        user: { updateMany: userUpdateManyMock },
      }),
    ),
  },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

import { DELETE, PATCH } from "./route";

const patchRequest = (body: unknown) =>
  new Request("http://localhost/api/workspaces/current/members/t1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const deleteRequest = () =>
  new Request("http://localhost/api/workspaces/current/members/t1", { method: "DELETE" });
const params = { params: Promise.resolve({ userId: "t1" }) };

// findUnique は「実行者(u1)の再検証」と「対象(t1)の取得」の2用途で呼ばれるため、
// userId で出し分ける。actorRole / targetMembership をテストごとに差し替える。
let actorRole: string;
let targetMembership: { id: string; userId: string; workspaceId: string; role: string } | null;

beforeEach(() => {
  actorRole = "OWNER";
  targetMembership = { id: "mem-t1", userId: "t1", workspaceId: "ws1", role: "MEMBER" };
  membershipFindUniqueMock.mockReset();
  membershipFindUniqueMock.mockImplementation(async ({ where }) =>
    where.userId_workspaceId.userId === "u1" ? { role: actorRole } : targetMembership
  );
  membershipCountMock.mockReset();
  membershipCountMock.mockResolvedValue(2); // 既定: OWNER は2人いる（最後のOWNERではない）
  membershipUpdateMock.mockReset();
  membershipDeleteMock.mockReset();
  userUpdateManyMock.mockReset();
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
});

describe("PATCH /api/workspaces/current/members/[userId]", () => {
  it("returns 401 when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);
    const res = await PATCH(patchRequest({ role: "ADMIN" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a plain MEMBER actor", async () => {
    actorRole = "MEMBER";
    const res = await PATCH(patchRequest({ role: "ADMIN" }), params);
    expect(res.status).toBe(403);
    expect(membershipUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid role value", async () => {
    const res = await PATCH(patchRequest({ role: "SUPERUSER" }), params);
    expect(res.status).toBe(400);
  });

  it("returns 404 when the target is not a member of the current workspace", async () => {
    targetMembership = null;
    const res = await PATCH(patchRequest({ role: "ADMIN" }), params);
    expect(res.status).toBe(404);
  });

  it("lets an OWNER change any role (MEMBER -> ADMIN)", async () => {
    const res = await PATCH(patchRequest({ role: "ADMIN" }), params);
    expect(res.status).toBe(200);
    expect(membershipUpdateMock).toHaveBeenCalledWith({
      where: { id: "mem-t1" },
      data: { role: "ADMIN" },
    });
  });

  it("lets an ADMIN change MEMBER <-> ADMIN", async () => {
    actorRole = "ADMIN";
    const res = await PATCH(patchRequest({ role: "ADMIN" }), params);
    expect(res.status).toBe(200);
  });

  it("forbids an ADMIN from promoting anyone to OWNER", async () => {
    actorRole = "ADMIN";
    const res = await PATCH(patchRequest({ role: "OWNER" }), params);
    expect(res.status).toBe(403);
    expect(membershipUpdateMock).not.toHaveBeenCalled();
  });

  it("forbids an ADMIN from touching an OWNER", async () => {
    actorRole = "ADMIN";
    targetMembership = { id: "mem-t1", userId: "t1", workspaceId: "ws1", role: "OWNER" };
    const res = await PATCH(patchRequest({ role: "MEMBER" }), params);
    expect(res.status).toBe(403);
  });

  it("returns 409 when demoting the last OWNER (workspace lockout prevention)", async () => {
    targetMembership = { id: "mem-t1", userId: "t1", workspaceId: "ws1", role: "OWNER" };
    membershipCountMock.mockResolvedValue(1);
    const res = await PATCH(patchRequest({ role: "MEMBER" }), params);
    expect(res.status).toBe(409);
    expect(membershipUpdateMock).not.toHaveBeenCalled();
    expect(membershipCountMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", role: "OWNER" },
    });
  });

  it("is a no-op 200 when the role is unchanged", async () => {
    const res = await PATCH(patchRequest({ role: "MEMBER" }), params);
    expect(res.status).toBe(200);
    expect(membershipUpdateMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/workspaces/current/members/[userId]", () => {
  it("removes a member and resets their lastWorkspaceId if it pointed here", async () => {
    const res = await DELETE(deleteRequest(), params);
    expect(res.status).toBe(200);
    expect(membershipDeleteMock).toHaveBeenCalledWith({ where: { id: "mem-t1" } });
    // 除名した人の現在WSがここを指したままだと次のJWT更新まで403が続くため null に戻す
    expect(userUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "t1", lastWorkspaceId: "ws1" },
      data: { lastWorkspaceId: null },
    });
  });

  it("forbids an ADMIN from removing an OWNER", async () => {
    actorRole = "ADMIN";
    targetMembership = { id: "mem-t1", userId: "t1", workspaceId: "ws1", role: "OWNER" };
    const res = await DELETE(deleteRequest(), params);
    expect(res.status).toBe(403);
    expect(membershipDeleteMock).not.toHaveBeenCalled();
  });

  it("returns 409 when removing the last OWNER", async () => {
    targetMembership = { id: "mem-t1", userId: "t1", workspaceId: "ws1", role: "OWNER" };
    membershipCountMock.mockResolvedValue(1);
    const res = await DELETE(deleteRequest(), params);
    expect(res.status).toBe(409);
    expect(membershipDeleteMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a user outside the current workspace", async () => {
    targetMembership = null;
    const res = await DELETE(deleteRequest(), params);
    expect(res.status).toBe(404);
  });
});
