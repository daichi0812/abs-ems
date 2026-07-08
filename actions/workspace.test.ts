import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  membershipFindUniqueMock,
  membershipCreateMock,
  inviteFindUniqueMock,
  inviteUpdateMock,
  userUpdateMock,
  workspaceFindUniqueMock,
  currentUserMock,
} = vi.hoisted(() => ({
  membershipFindUniqueMock: vi.fn(),
  membershipCreateMock: vi.fn(),
  inviteFindUniqueMock: vi.fn(),
  inviteUpdateMock: vi.fn(),
  userUpdateMock: vi.fn(),
  workspaceFindUniqueMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    membership: { findUnique: membershipFindUniqueMock },
    workspaceInvite: { findUnique: inviteFindUniqueMock },
    workspace: { findUnique: workspaceFindUniqueMock },
    user: { update: userUpdateMock },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        membership: { create: membershipCreateMock },
        workspaceInvite: { update: inviteUpdateMock },
        user: { update: userUpdateMock },
      }),
    ),
  },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

import { acceptInvite, switchWorkspace } from "./workspace";

const validInvite = () => ({
  id: "inv1",
  workspaceId: "ws2",
  code: "code1",
  role: "MEMBER",
  expiresAt: new Date(Date.now() + 3600 * 1000),
  maxUses: null,
  usedCount: 0,
});

beforeEach(() => {
  membershipFindUniqueMock.mockReset();
  membershipCreateMock.mockReset();
  inviteFindUniqueMock.mockReset();
  inviteUpdateMock.mockReset();
  userUpdateMock.mockReset();
  workspaceFindUniqueMock.mockReset();
  workspaceFindUniqueMock.mockResolvedValue({ name: "テスト団体" });
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "u1" });
});

describe("switchWorkspace", () => {
  it("returns error when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);
    const result = await switchWorkspace("ws2");
    expect(result).toEqual({ error: "認証されていません。" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects switching to a workspace the user is not a member of", async () => {
    membershipFindUniqueMock.mockResolvedValue(null);
    const result = await switchWorkspace("ws2");
    expect(result).toEqual({ error: "このワークスペースには所属していません。" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("updates lastWorkspaceId after verifying membership", async () => {
    membershipFindUniqueMock.mockResolvedValue({ id: "m1" });
    const result = await switchWorkspace("ws2");
    expect(result).toEqual({ success: true });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { lastWorkspaceId: "ws2" },
    });
  });
});

describe("acceptInvite", () => {
  it("returns error for an unknown code", async () => {
    inviteFindUniqueMock.mockResolvedValue(null);
    const result = await acceptInvite("nope");
    expect(result).toEqual({ error: "招待リンクが見つかりません。" });
  });

  it("returns error for an expired invite", async () => {
    inviteFindUniqueMock.mockResolvedValue({
      ...validInvite(),
      expiresAt: new Date(Date.now() - 1000),
    });
    const result = await acceptInvite("code1");
    expect("error" in result && result.error).toMatch(/有効期限/);
    expect(membershipCreateMock).not.toHaveBeenCalled();
  });

  it("returns error when usage limit is reached", async () => {
    inviteFindUniqueMock.mockResolvedValue({ ...validInvite(), maxUses: 3, usedCount: 3 });
    const result = await acceptInvite("code1");
    expect("error" in result && result.error).toMatch(/上限/);
    expect(membershipCreateMock).not.toHaveBeenCalled();
  });

  it("creates a membership with the invite's role, counts the use, and switches", async () => {
    inviteFindUniqueMock.mockResolvedValue(validInvite());
    membershipFindUniqueMock.mockResolvedValue(null); // 未所属

    const result = await acceptInvite("code1");

    expect(result).toEqual({ success: true, workspaceName: "テスト団体" });
    expect(membershipCreateMock).toHaveBeenCalledWith({
      data: { userId: "u1", workspaceId: "ws2", role: "MEMBER" },
    });
    expect(inviteUpdateMock).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { usedCount: { increment: 1 } },
    });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { lastWorkspaceId: "ws2" },
    });
  });

  it("only switches (no new membership, no count) when already a member", async () => {
    inviteFindUniqueMock.mockResolvedValue(validInvite());
    membershipFindUniqueMock.mockResolvedValue({ id: "m1" }); // 既所属

    const result = await acceptInvite("code1");

    expect(result).toEqual({ success: true, workspaceName: "テスト団体" });
    expect(membershipCreateMock).not.toHaveBeenCalled();
    expect(inviteUpdateMock).not.toHaveBeenCalled();
    expect(userUpdateMock).toHaveBeenCalled();
  });
});
