import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn() },
    passwordResetToken: { delete: vi.fn() },
  },
}));

vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

vi.mock("@/data/password-reset-token", () => ({
  getPasswordResetTokenByToken: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(async () => "hashed-new") },
}));

import { db } from "@/lib/db";
import { getUserByEmail } from "@/data/user";
import { getPasswordResetTokenByToken } from "@/data/password-reset-token";
import { newPassword } from "./new-password";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("newPassword", () => {
  const validInput = { password: "tenchars12" };

  it("returns error when token is missing", async () => {
    const result = await newPassword(validInput, null);
    expect(result).toEqual({ error: "トークンがありません！" });
  });

  it("returns error on invalid password input", async () => {
    const result = await newPassword({ password: "short" }, "tok");
    expect(result).toEqual({ error: "無効な入力です！" });
  });

  it("returns error when reset token does not exist", async () => {
    vi.mocked(getPasswordResetTokenByToken).mockResolvedValue(null);

    const result = await newPassword(validInput, "tok");
    expect(result).toEqual({ error: "無効なトークンです！" });
  });

  it("returns error when token has expired", async () => {
    vi.mocked(getPasswordResetTokenByToken).mockResolvedValue({
      id: "t1",
      email: "a@b.com",
      expires: new Date(Date.now() - 60_000),
    } as never);

    const result = await newPassword(validInput, "tok");
    expect(result).toEqual({ error: "トークンの有効期限が切れています！" });
  });

  it("returns error when user does not exist", async () => {
    vi.mocked(getPasswordResetTokenByToken).mockResolvedValue({
      id: "t1",
      email: "a@b.com",
      expires: new Date(Date.now() + 60_000),
    } as never);
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const result = await newPassword(validInput, "tok");
    expect(result).toEqual({ error: "存在しないメールアドレスです！" });
  });

  it("updates password, deletes token, and returns success", async () => {
    vi.mocked(getPasswordResetTokenByToken).mockResolvedValue({
      id: "t1",
      email: "a@b.com",
      expires: new Date(Date.now() + 60_000),
    } as never);
    vi.mocked(getUserByEmail).mockResolvedValue({ id: "u1" } as never);

    const result = await newPassword(validInput, "tok");

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { password: "hashed-new" },
    });
    expect(db.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { id: "t1" },
    });
    expect(result).toEqual({ success: "パスワードが再設定されました！" });
  });
});
