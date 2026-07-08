// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  membershipFindManyMock,
  workspaceFindManyMock,
  workspaceCreateMock,
  membershipCreateMock,
  userUpdateMock,
  currentUserMock,
} = vi.hoisted(() => ({
  membershipFindManyMock: vi.fn(),
  workspaceFindManyMock: vi.fn(),
  workspaceCreateMock: vi.fn(),
  membershipCreateMock: vi.fn(),
  userUpdateMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    membership: { findMany: membershipFindManyMock },
    workspace: { findMany: workspaceFindManyMock },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        workspace: { create: workspaceCreateMock },
        membership: { create: membershipCreateMock },
        user: { update: userUpdateMock },
      }),
    ),
  },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

import { GET, POST } from "./route";

const postRequest = (body: unknown) =>
  new Request("http://localhost/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  membershipFindManyMock.mockReset();
  membershipFindManyMock.mockResolvedValue([]);
  workspaceFindManyMock.mockReset();
  workspaceFindManyMock.mockResolvedValue([]);
  workspaceCreateMock.mockReset();
  membershipCreateMock.mockReset();
  userUpdateMock.mockReset();
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "u1", role: "USER" });
});

describe("GET /api/workspaces", () => {
  it("returns 401 when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(membershipFindManyMock).not.toHaveBeenCalled();
  });

  it("returns own memberships joined with workspace names (membership order)", async () => {
    membershipFindManyMock.mockResolvedValue([
      { workspaceId: "ws1", role: "MEMBER" },
      { workspaceId: "ws2", role: "OWNER" },
    ]);
    workspaceFindManyMock.mockResolvedValue([
      { id: "ws2", name: "自分の団体" },
      { id: "ws1", name: "放送部" },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: "ws1", name: "放送部", role: "MEMBER" },
      { id: "ws2", name: "自分の団体", role: "OWNER" },
    ]);
    // 所属ゼロのユーザーも呼ぶ経路なので自分の membership だけを引く
    expect(membershipFindManyMock).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true, role: true },
    });
  });

  it("returns an empty array for a user with no memberships", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/workspaces", () => {
  it("returns 401 when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await POST(postRequest({ name: "新団体" }));

    expect(res.status).toBe(401);
    expect(workspaceCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty or too-long name", async () => {
    for (const name of ["", "   ", "あ".repeat(51)]) {
      const res = await POST(postRequest({ name }));
      expect(res.status).toBe(400);
    }
    expect(workspaceCreateMock).not.toHaveBeenCalled();
  });

  it("creates the workspace, an OWNER membership, and switches lastWorkspaceId in one transaction", async () => {
    workspaceCreateMock.mockResolvedValue({ id: "ws-new", name: "新団体", slug: "w-abc" });

    const res = await POST(postRequest({ name: "  新団体  " }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "ws-new", name: "新団体" });
    // trim された name とランダム slug で作成
    const createArg = workspaceCreateMock.mock.calls[0][0];
    expect(createArg.data.name).toBe("新団体");
    expect(createArg.data.slug).toMatch(/^w-[0-9a-f-]{8}$/);
    expect(membershipCreateMock).toHaveBeenCalledWith({
      data: { userId: "u1", workspaceId: "ws-new", role: "OWNER" },
    });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { lastWorkspaceId: "ws-new" },
    });
  });
});
