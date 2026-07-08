// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, findFirstMock, createMock, membershipFindUniqueMock, currentUserMock } =
  vi.hoisted(() => ({
    findManyMock: vi.fn(),
    findFirstMock: vi.fn(),
    createMock: vi.fn(),
    membershipFindUniqueMock: vi.fn(),
    currentUserMock: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    tag: { findMany: findManyMock, findFirst: findFirstMock, create: createMock },
    membership: { findUnique: membershipFindUniqueMock },
  },
}));
// GET はログイン必須。POST は requireWorkspaceManager（membership.role で判定）。
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

import { GET, POST } from "./route";

const postRequest = (body: unknown = { name: "Audio", color: "#fff" }) =>
  new Request("http://localhost/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  findManyMock.mockReset();
  findFirstMock.mockReset();
  findFirstMock.mockResolvedValue(null);
  createMock.mockReset();
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
  membershipFindUniqueMock.mockReset();
  // requireWorkspaceMember が JWT の currentWorkspaceId を membership で再検証する。
  // POST は管理ルートなので既定は ADMIN（一般部員のケースは各テストで MEMBER に上書き）。
  membershipFindUniqueMock.mockResolvedValue({ role: "ADMIN" });
});

describe("GET /api/tags", () => {
  it("returns 401 and does not query when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns the tags scoped to the current workspace", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    findManyMock.mockResolvedValue([{ id: 1, name: "Audio", color: "#fff" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    // 他ワークスペースのカテゴリを露出させない（workspaceId フィルタを固定する）
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws1" } }),
    );
  });
});

describe("POST /api/tags", () => {
  it("returns 401 and does not create when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await POST(postRequest());

    expect(res.status).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a workspace MEMBER (managers only)", async () => {
    // 権限は membership.role（OWNER/ADMIN）一本。一般部員はカテゴリを作成できない。
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });

    const res = await POST(postRequest());

    expect(res.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body (TagSchema)", async () => {
    const res = await POST(postRequest({ name: "", color: "#fff" }));

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates the tag at the end of the current workspace's order for an ADMIN", async () => {
    // 既存の最大 sortOrder は 3 → 新規は 4（末尾に追加）
    findFirstMock.mockResolvedValue({ sortOrder: 3 });
    createMock.mockResolvedValue({ id: 1 });

    const res = await POST(postRequest({ name: "Audio", color: "#fff" }));

    expect(res.status).toBe(201);
    // 他ワークスペースへ作らせない（workspaceId をサーバー側で固定する）
    expect(createMock).toHaveBeenCalledWith({
      data: { name: "Audio", color: "#fff", sortOrder: 4, workspaceId: "ws1" },
    });
  });
});
