// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findManyMock,
  membershipFindUniqueMock,
  membershipFindManyMock,
  currentUserMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  membershipFindManyMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: findManyMock },
    membership: { findUnique: membershipFindUniqueMock, findMany: membershipFindManyMock },
  },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

import { GET } from "./route";

const getRequest = () => new Request("http://localhost/api/users");

beforeEach(() => {
  findManyMock.mockReset();
  currentUserMock.mockReset();
  membershipFindUniqueMock.mockReset();
  // requireWorkspaceMember が JWT の currentWorkspaceId を membership で再検証する
  membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });
  membershipFindManyMock.mockReset();
});

describe("GET /api/users", () => {
  it("returns 401 and does not query when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await GET(getRequest());

    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns only id/name of the current workspace members", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
    membershipFindManyMock.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    findManyMock.mockResolvedValue([{ id: "u1", name: "Taro" }]);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    // 現在のワークスペースのメンバー id を引いてから絞る（別団体の氏名を露出させない）
    expect(membershipFindManyMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1" },
      select: { userId: true },
    });
    // password/email を出さない列制限を固定する
    expect(findManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["u1", "u2"] } },
      select: { id: true, name: true },
    });
  });
});
