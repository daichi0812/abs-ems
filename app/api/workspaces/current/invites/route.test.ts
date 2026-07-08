// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  inviteCreateMock,
  membershipFindUniqueMock,
  currentUserMock,
} = vi.hoisted(() => ({
  inviteCreateMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    workspaceInvite: { create: inviteCreateMock },
    membership: { findUnique: membershipFindUniqueMock },
  },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

import { POST } from "./route";

const postRequest = () =>
  new Request("http://localhost/api/workspaces/current/invites", { method: "POST" });

beforeEach(() => {
  inviteCreateMock.mockReset();
  membershipFindUniqueMock.mockReset();
  membershipFindUniqueMock.mockResolvedValue({ role: "OWNER" });
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "u1", role: "USER", currentWorkspaceId: "ws1" });
});

describe("POST /api/workspaces/current/invites", () => {
  it("returns 401 when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await POST(postRequest());

    expect(res.status).toBe(401);
    expect(inviteCreateMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a workspace MEMBER (managers only)", async () => {
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });

    const res = await POST(postRequest());

    expect(res.status).toBe(403);
    expect(inviteCreateMock).not.toHaveBeenCalled();
  });

  it("issues a 7-day invite for the current workspace and returns the URL", async () => {
    inviteCreateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      id: "inv1",
    }));

    const res = await POST(postRequest());

    expect(res.status).toBe(201);
    const body = await res.json();
    // code は URL に安全な 32 桁 hex（uuid からハイフンを除去）
    expect(body.code).toMatch(/^[0-9a-f]{32}$/);
    expect(body.url).toBe(`${process.env.NEXT_PUBLIC_APP_URL ?? "https://abs-ems.forgeonics.com"}/invite/${body.code}`);
    const data = inviteCreateMock.mock.calls[0][0].data;
    expect(data.workspaceId).toBe("ws1");
    expect(data.createdBy).toBe("u1");
    // 有効期限はおよそ7日後（±1分）
    const ttl = data.expiresAt.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(7 * 24 * 3600 * 1000 - 60_000);
    expect(ttl).toBeLessThan(7 * 24 * 3600 * 1000 + 60_000);
  });
});
