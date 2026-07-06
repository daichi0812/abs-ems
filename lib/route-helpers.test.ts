// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { currentUserMock, hasManagerAccessMock } = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  hasManagerAccessMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));
vi.mock("@/lib/api-auth", () => ({
  hasManagerAccess: (req: Request) => hasManagerAccessMock(req),
}));

import { NextResponse } from "next/server";
import { requireUser, requireManager, requireDeveloper } from "./route-helpers";

beforeEach(() => {
  currentUserMock.mockReset();
  hasManagerAccessMock.mockReset();
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

describe("requireManager", () => {
  it("権限があれば null を返す", async () => {
    hasManagerAccessMock.mockResolvedValue(true);
    expect(await requireManager(new Request("http://localhost"))).toBeNull();
  });

  it("権限がなければ 403 レスポンスを返す", async () => {
    hasManagerAccessMock.mockResolvedValue(false);
    const denied = await requireManager(new Request("http://localhost"));
    expect(denied).toBeInstanceOf(NextResponse);
    expect((denied as NextResponse).status).toBe(403);
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
