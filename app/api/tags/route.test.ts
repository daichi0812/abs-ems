// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, membershipFindUniqueMock, currentUserMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    tag: { findMany: findManyMock },
    membership: { findUnique: membershipFindUniqueMock },
  },
}));
// GET はログイン必須。POST の hasManagerAccess 経由で currentRole も参照されうるため両方出す。
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
  currentRole: vi.fn(),
}));

import { GET } from "./route";

beforeEach(() => {
  findManyMock.mockReset();
  currentUserMock.mockReset();
  membershipFindUniqueMock.mockReset();
  // requireWorkspaceMember が JWT の currentWorkspaceId を membership で再検証する
  membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });
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
