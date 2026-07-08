// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  membershipFindUniqueMock,
  membershipFindManyMock,
  userFindManyMock,
  currentUserMock,
} = vi.hoisted(() => ({
  membershipFindUniqueMock: vi.fn(),
  membershipFindManyMock: vi.fn(),
  userFindManyMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    membership: {
      findUnique: membershipFindUniqueMock,
      findMany: membershipFindManyMock,
    },
    user: { findMany: userFindManyMock },
  },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

import { GET } from "./route";

beforeEach(() => {
  membershipFindUniqueMock.mockReset();
  membershipFindUniqueMock.mockResolvedValue({ role: "ADMIN" });
  membershipFindManyMock.mockReset();
  membershipFindManyMock.mockResolvedValue([]);
  userFindManyMock.mockReset();
  userFindManyMock.mockResolvedValue([]);
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
});

describe("GET /api/workspaces/current/members", () => {
  it("returns 401 when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(membershipFindManyMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a plain MEMBER (role-sensitive list is manager-only)", async () => {
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });

    const res = await GET();

    expect(res.status).toBe(403);
    expect(membershipFindManyMock).not.toHaveBeenCalled();
  });

  it("returns members of the current workspace sorted by role then name", async () => {
    membershipFindManyMock.mockResolvedValue([
      { userId: "m1", role: "MEMBER", createdAt: new Date("2026-07-01") },
      { userId: "o1", role: "OWNER", createdAt: new Date("2026-07-01") },
      { userId: "a1", role: "ADMIN", createdAt: new Date("2026-07-02") },
    ]);
    userFindManyMock.mockResolvedValue([
      { id: "m1", name: "部員", image: null },
      { id: "o1", name: "部長", image: "https://example.com/o.png" },
      { id: "a1", name: "副部長", image: null },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((m: { userId: string }) => m.userId)).toEqual(["o1", "a1", "m1"]);
    expect(body[0]).toMatchObject({ userId: "o1", name: "部長", role: "OWNER" });
    // ワークスペースで絞っている（テナント境界）
    expect(membershipFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws1" } })
    );
  });
});
