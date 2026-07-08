// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  currentUserMock,
  userFindUniqueMock,
  membershipFindFirstMock,
  membershipFindUniqueMock,
} = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  membershipFindFirstMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: userFindUniqueMock },
    membership: { findFirst: membershipFindFirstMock, findUnique: membershipFindUniqueMock },
  },
}));

import { NextResponse } from "next/server";
import {
  requireUser,
  requireDeveloper,
  requireWorkspaceMember,
  requireWorkspaceManager,
  isWorkspaceManagerRole,
} from "./route-helpers";

beforeEach(() => {
  currentUserMock.mockReset();
  userFindUniqueMock.mockReset().mockResolvedValue(null);
  membershipFindFirstMock.mockReset().mockResolvedValue(null);
  membershipFindUniqueMock.mockReset().mockResolvedValue(null);
  vi.stubEnv("DEVELOPER_EMAILS", "dev@example.com");
});

describe("requireUser", () => {
  it("認証済みならユーザーを返す", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER" });
    const result = await requireUser();
    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as { id: string }).id).toBe("u1");
  });

  it("未認証なら 401 レスポンスを返す", async () => {
    currentUserMock.mockResolvedValue(undefined);
    const result = await requireUser();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });
});

describe("requireDeveloper", () => {
  it("開発者メールならユーザーを返す", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", email: "dev@example.com" });
    const result = await requireDeveloper();
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it("未認証なら 401", async () => {
    currentUserMock.mockResolvedValue(undefined);
    expect((await requireDeveloper() as NextResponse).status).toBe(401);
  });

  it("開発者でなければ 403", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", email: "member@example.com" });
    expect((await requireDeveloper() as NextResponse).status).toBe(403);
  });
});

describe("requireWorkspaceMember", () => {
  it("未認証なら 401", async () => {
    currentUserMock.mockResolvedValue(undefined);
    const result = await requireWorkspaceMember();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("JWT の currentWorkspaceId で membership を再検証し、通れば ctx を返す", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", currentWorkspaceId: "ws1" });
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });

    const ctx = await requireWorkspaceMember();

    expect(ctx).not.toBeInstanceOf(NextResponse);
    expect(ctx).toMatchObject({ workspaceId: "ws1", workspaceRole: "MEMBER" });
    // JWT に workspaceId があるので DB フォールバック（user / findFirst）は走らない
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(membershipFindFirstMock).not.toHaveBeenCalled();
    // membership 自体は毎回 DB で再検証する（除名直後の越境防止）
    expect(membershipFindUniqueMock).toHaveBeenCalledWith({
      where: { userId_workspaceId: { userId: "u1", workspaceId: "ws1" } },
      select: { role: true },
    });
  });

  it("currentWorkspaceId があっても membership が無ければ 403（除名直後の古い JWT）", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", currentWorkspaceId: "ws1" });
    membershipFindUniqueMock.mockResolvedValue(null);

    const result = await requireWorkspaceMember();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("currentWorkspaceId 不在なら lastWorkspaceId フォールバックで解決する（古い JWT の移行期経路）", async () => {
    currentUserMock.mockResolvedValue({ id: "u1" });
    userFindUniqueMock.mockResolvedValue({ lastWorkspaceId: "ws2" });
    membershipFindUniqueMock.mockResolvedValue({ role: "ADMIN" });

    const ctx = await requireWorkspaceMember();

    expect(ctx).not.toBeInstanceOf(NextResponse);
    expect(ctx).toMatchObject({ workspaceId: "ws2", workspaceRole: "ADMIN" });
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { lastWorkspaceId: true },
    });
    // lastWorkspaceId で解決できたので最初の所属へのフォールバックは不要
    expect(membershipFindFirstMock).not.toHaveBeenCalled();
  });

  it("lastWorkspaceId も無ければ最初の所属へフォールバックする", async () => {
    currentUserMock.mockResolvedValue({ id: "u1" });
    userFindUniqueMock.mockResolvedValue({ lastWorkspaceId: null });
    membershipFindFirstMock.mockResolvedValue({ workspaceId: "ws3" });
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });

    const ctx = await requireWorkspaceMember();

    expect(ctx).not.toBeInstanceOf(NextResponse);
    expect(ctx).toMatchObject({ workspaceId: "ws3", workspaceRole: "MEMBER" });
  });

  it("どこからも workspace を解決できなければ 403", async () => {
    currentUserMock.mockResolvedValue({ id: "u1" });
    userFindUniqueMock.mockResolvedValue({ lastWorkspaceId: null });
    membershipFindFirstMock.mockResolvedValue(null);

    const result = await requireWorkspaceMember();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
    expect(membershipFindUniqueMock).not.toHaveBeenCalled();
  });
});

describe("requireWorkspaceManager", () => {
  it("workspaceRole が ADMIN なら許可", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", currentWorkspaceId: "ws1" });
    membershipFindUniqueMock.mockResolvedValue({ role: "ADMIN" });

    const ctx = await requireWorkspaceManager();

    expect(ctx).not.toBeInstanceOf(NextResponse);
    expect(ctx).toMatchObject({ workspaceId: "ws1", workspaceRole: "ADMIN" });
  });

  it("workspaceRole が OWNER なら許可", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", currentWorkspaceId: "ws1" });
    membershipFindUniqueMock.mockResolvedValue({ role: "OWNER" });

    const ctx = await requireWorkspaceManager();

    expect(ctx).not.toBeInstanceOf(NextResponse);
    expect(ctx).toMatchObject({ workspaceId: "ws1", workspaceRole: "OWNER" });
  });

  it("MEMBER は無条件で 403（旧 hasManagerAccess フォールバックは撤去済み）", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", currentWorkspaceId: "ws1" });
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });

    const result = await requireWorkspaceManager();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("未認証なら 401", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const result = await requireWorkspaceManager();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });
});

describe("isWorkspaceManagerRole", () => {
  it("OWNER / ADMIN は管理ロール、MEMBER は非管理ロール", () => {
    expect(isWorkspaceManagerRole("OWNER")).toBe(true);
    expect(isWorkspaceManagerRole("ADMIN")).toBe(true);
    expect(isWorkspaceManagerRole("MEMBER")).toBe(false);
  });
});
