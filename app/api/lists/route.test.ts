// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, createMock, membershipFindUniqueMock, currentUserMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  createMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    list: { findMany: findManyMock, create: createMock },
    membership: { findUnique: membershipFindUniqueMock },
  },
}));
// GET はログイン必須。POST は requireWorkspaceManager（membership.role で判定）。
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));
// 通知はバックグラウンド副作用なので、ルートの契約テストでは無効化する。
vi.mock("@/lib/notify", () => ({
  notifyInBackground: vi.fn(),
  notifyNewEquipment: vi.fn(),
}));

import { GET, POST } from "./route";

const getRequest = () => new Request("http://localhost/api/lists");
const postRequest = (body: Record<string, unknown> = { name: "Camera" }) =>
  new Request("http://localhost/api/lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  findManyMock.mockReset();
  createMock.mockReset();
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
  membershipFindUniqueMock.mockReset();
  // requireWorkspaceMember が JWT の currentWorkspaceId を membership で再検証する。
  // POST は管理ルートなので既定は ADMIN（一般部員のケースは各テストで MEMBER に上書き）。
  membershipFindUniqueMock.mockResolvedValue({ role: "ADMIN" });
});

describe("GET /api/lists", () => {
  it("returns 401 and does not query when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await GET(getRequest());

    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns the lists scoped to the current workspace", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    findManyMock.mockResolvedValue([{ id: 1, name: "Camera" }]);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    // 他ワークスペースの機材を露出させない（workspaceId フィルタを固定する）
    expect(findManyMock).toHaveBeenCalledWith({ where: { workspaceId: "ws1" } });
  });
});

describe("POST /api/lists", () => {
  it("returns 401 and does not create when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await POST(postRequest());

    expect(res.status).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a workspace MEMBER (managers only)", async () => {
    // 権限は membership.role（OWNER/ADMIN）一本。一般部員は機材を追加できない。
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });

    const res = await POST(postRequest());

    expect(res.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates the equipment scoped to the current workspace for an ADMIN", async () => {
    createMock.mockResolvedValue({ id: 1, name: "Camera" });

    const res = await POST(postRequest({ name: "Camera", detail: "d", image: null, tag_id: 2 }));

    expect(res.status).toBe(201);
    // 他ワークスペースへ作らせない（workspaceId をサーバー側で固定する）
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Camera", workspaceId: "ws1" }),
    });
  });
});
