// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserByIdMock, getAccountByUserIdMock, getMembershipsByUserIdMock } = vi.hoisted(() => ({
  getUserByIdMock: vi.fn(),
  getAccountByUserIdMock: vi.fn(),
  getMembershipsByUserIdMock: vi.fn(),
}));

vi.mock("@/data/user", () => ({ getUserById: getUserByIdMock }));
vi.mock("@/data/account", () => ({ getAccountByUserId: getAccountByUserIdMock }));
vi.mock("@/data/membership", () => ({ getMembershipsByUserId: getMembershipsByUserIdMock }));

import { ROLE_REFRESH_INTERVAL_MS, refreshJwtToken } from "./jwt-refresh";

const dbUser = {
  id: "u1",
  name: "Taro",
  email: "taro@example.com",
  role: "ADMIN",
  isTwoFactorEnabled: false,
  lastWorkspaceId: null as string | null,
};

beforeEach(() => {
  getUserByIdMock.mockReset();
  getUserByIdMock.mockResolvedValue(dbUser);
  getAccountByUserIdMock.mockReset();
  getAccountByUserIdMock.mockResolvedValue(null);
  // 既定は所属ゼロ（ワークスペース解決を検証しないテストを安定させる）
  getMembershipsByUserIdMock.mockReset();
  getMembershipsByUserIdMock.mockResolvedValue([]);
});

describe("refreshJwtToken", () => {
  it("sub が無い token はそのまま返し、DB に触れない", async () => {
    const token = {};
    const out = await refreshJwtToken({ token });
    expect(out).toBe(token);
    expect(getUserByIdMock).not.toHaveBeenCalled();
  });

  it("サインイン直後（user あり）は DB を照会して token に反映する", async () => {
    const token: Record<string, unknown> = { sub: "u1" };
    const out = await refreshJwtToken({ token, user: { id: "u1" } });

    expect(getUserByIdMock).toHaveBeenCalledWith("u1");
    expect(out.role).toBe("ADMIN");
    expect(out.name).toBe("Taro");
    expect(out.isOAuth).toBe(false);
    expect(typeof out.refreshedAt).toBe("number");
  });

  it("refreshedAt が新しい通常リクエストでは DB 照会しない（全リクエスト2クエリの回帰防止）", async () => {
    const token = { sub: "u1", role: "USER", refreshedAt: Date.now() };
    const out = await refreshJwtToken({ token });

    expect(getUserByIdMock).not.toHaveBeenCalled();
    expect(getAccountByUserIdMock).not.toHaveBeenCalled();
    expect(out.role).toBe("USER");
  });

  it("refreshedAt が閾値を超えていたら再照会する（DB での role 変更が最大15分で反映される）", async () => {
    const token = {
      sub: "u1",
      role: "USER",
      refreshedAt: Date.now() - ROLE_REFRESH_INTERVAL_MS - 1000,
    };
    const out = await refreshJwtToken({ token });

    expect(getUserByIdMock).toHaveBeenCalledWith("u1");
    expect(out.role).toBe("ADMIN");
  });

  it("refreshedAt を持たない既存セッションの token は初回に再照会する（後方互換）", async () => {
    const token = { sub: "u1", role: "USER" };
    const out = await refreshJwtToken({ token });

    expect(getUserByIdMock).toHaveBeenCalledWith("u1");
    expect(out.role).toBe("ADMIN");
  });

  it("trigger=update は経過時間に関係なく再照会する（update({}) による即時反映の経路）", async () => {
    const token = { sub: "u1", name: "旧名", refreshedAt: Date.now() };
    const out = await refreshJwtToken({ token, trigger: "update" });

    expect(getUserByIdMock).toHaveBeenCalledWith("u1");
    expect(out.name).toBe("Taro");
  });

  it("ユーザーが DB に存在しなければ token を書き換えずに返す", async () => {
    getUserByIdMock.mockResolvedValue(null);
    const token = { sub: "gone", role: "USER" };
    const out = await refreshJwtToken({ token, trigger: "update" });

    expect(out.role).toBe("USER");
    expect(out.refreshedAt).toBeUndefined();
  });

  it("OAuth アカウントがあれば isOAuth=true", async () => {
    getAccountByUserIdMock.mockResolvedValue({ provider: "google" });
    const out = await refreshJwtToken({ token: { sub: "u1" }, user: { id: "u1" } });
    expect(out.isOAuth).toBe(true);
  });

  it("lastWorkspaceId に一致する所属があれば、その workspace/role を token に載せる", async () => {
    getUserByIdMock.mockResolvedValue({ ...dbUser, lastWorkspaceId: "ws2" });
    getMembershipsByUserIdMock.mockResolvedValue([
      { workspaceId: "ws1", role: "OWNER" },
      { workspaceId: "ws2", role: "MEMBER" },
    ]);

    const out = await refreshJwtToken({ token: { sub: "u1" }, user: { id: "u1" } });

    expect(getMembershipsByUserIdMock).toHaveBeenCalledWith("u1");
    expect(out.currentWorkspaceId).toBe("ws2");
    expect(out.workspaceRole).toBe("MEMBER");
  });

  it("lastWorkspaceId に一致が無ければ最初の所属へフォールバック（除名・不整合時）", async () => {
    getUserByIdMock.mockResolvedValue({ ...dbUser, lastWorkspaceId: "ws-gone" });
    getMembershipsByUserIdMock.mockResolvedValue([
      { workspaceId: "ws1", role: "ADMIN" },
      { workspaceId: "ws2", role: "MEMBER" },
    ]);

    const out = await refreshJwtToken({ token: { sub: "u1" }, user: { id: "u1" } });

    expect(out.currentWorkspaceId).toBe("ws1");
    expect(out.workspaceRole).toBe("ADMIN");
  });

  it("所属ゼロなら currentWorkspaceId / workspaceRole は null", async () => {
    getUserByIdMock.mockResolvedValue({ ...dbUser, lastWorkspaceId: "ws1" });
    getMembershipsByUserIdMock.mockResolvedValue([]);

    const out = await refreshJwtToken({ token: { sub: "u1" }, user: { id: "u1" } });

    expect(out.currentWorkspaceId).toBeNull();
    expect(out.workspaceRole).toBeNull();
  });
});
