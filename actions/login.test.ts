import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MockAuthError } = vi.hoisted(() => {
  class MockAuthError extends Error {
    type: string;
    constructor(type: string, message?: string) {
      super(message);
      this.type = type;
    }
  }
  return { MockAuthError };
});

vi.mock("next-auth", () => ({
  AuthError: MockAuthError,
}));

vi.mock("@/lib/db", () => ({
  db: {
    twoFactorToken: { delete: vi.fn() },
    twoFactorConfirmation: { delete: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

vi.mock("@/data/two-factor-token", () => ({
  getTwoFactorTokenByEmail: vi.fn(),
}));

vi.mock("@/data/two-factor-confirmation", () => ({
  getTwoFactorConfirmationByUserId: vi.fn(),
}));

vi.mock("@/lib/mail", () => ({
  sendVerificationEmail: vi.fn(),
  sendTwoFactorTokenEmail: vi.fn(),
}));

vi.mock("@/lib/tokens", () => ({
  generateVerificationToken: vi.fn(),
  generateTwoFactorToken: vi.fn(),
}));

import { signIn } from "@/auth";
import { getUserByEmail } from "@/data/user";
import { getTwoFactorTokenByEmail } from "@/data/two-factor-token";
import { getTwoFactorConfirmationByUserId } from "@/data/two-factor-confirmation";
import { sendVerificationEmail, sendTwoFactorTokenEmail } from "@/lib/mail";
import { generateVerificationToken, generateTwoFactorToken } from "@/lib/tokens";
import { db } from "@/lib/db";
import { login } from "./login";

const verifiedUser = {
  id: "u1",
  email: "a@b.com",
  password: "hashed",
  emailVerified: new Date(),
  isTwoFactorEnabled: false,
};

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("login - input validation", () => {
  it("returns error on invalid input", async () => {
    const result = await login({ email: "bad", password: "" });
    expect(result).toEqual({ error: "入力に誤りがあります！" });
    expect(getUserByEmail).not.toHaveBeenCalled();
  });
});

describe("login - user lookup", () => {
  it("returns error when user does not exist", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    const result = await login({ email: "missing@b.com", password: "anything" });
    expect(result).toEqual({ error: "存在しないメールアドレスです！" });
  });

  it("returns error when user has no password (OAuth-only)", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({ ...verifiedUser, password: null } as never);
    const result = await login({ email: "a@b.com", password: "anything" });
    expect(result).toEqual({ error: "存在しないメールアドレスです！" });
  });
});

describe("login - email verification", () => {
  it("sends verification email and returns success when email not verified", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({ ...verifiedUser, emailVerified: null } as never);
    vi.mocked(generateVerificationToken).mockResolvedValue({
      email: "a@b.com",
      token: "vt",
    } as never);

    const result = await login({ email: "a@b.com", password: "anything" });

    expect(generateVerificationToken).toHaveBeenCalledWith("a@b.com");
    expect(sendVerificationEmail).toHaveBeenCalledWith("a@b.com", "vt");
    expect(result).toEqual({ success: "確認メールを送信しました！" });
  });
});

describe("login - 2FA flow without code", () => {
  it("sends 2FA token and returns twoFactor flag", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({
      ...verifiedUser,
      isTwoFactorEnabled: true,
    } as never);
    vi.mocked(generateTwoFactorToken).mockResolvedValue({
      email: "a@b.com",
      token: "123456",
    } as never);

    const result = await login({ email: "a@b.com", password: "anything" });

    expect(generateTwoFactorToken).toHaveBeenCalledWith("a@b.com");
    expect(sendTwoFactorTokenEmail).toHaveBeenCalledWith("a@b.com", "123456");
    expect(result).toEqual({ twoFactor: true });
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe("login - 2FA flow with code", () => {
  it("returns error when no 2FA token exists for user", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({
      ...verifiedUser,
      isTwoFactorEnabled: true,
    } as never);
    vi.mocked(getTwoFactorTokenByEmail).mockResolvedValue(null);

    const result = await login({ email: "a@b.com", password: "anything", code: "123456" });
    expect(result).toEqual({ error: "無効なコードです！" });
  });

  it("returns error when code does not match", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({
      ...verifiedUser,
      isTwoFactorEnabled: true,
    } as never);
    vi.mocked(getTwoFactorTokenByEmail).mockResolvedValue({
      id: "tt",
      token: "999999",
      expires: new Date(Date.now() + 60_000),
    } as never);

    const result = await login({ email: "a@b.com", password: "anything", code: "123456" });
    expect(result).toEqual({ error: "無効なコードです！" });
  });

  it("returns error when code has expired", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({
      ...verifiedUser,
      isTwoFactorEnabled: true,
    } as never);
    vi.mocked(getTwoFactorTokenByEmail).mockResolvedValue({
      id: "tt",
      token: "123456",
      expires: new Date(Date.now() - 60_000),
    } as never);

    const result = await login({ email: "a@b.com", password: "anything", code: "123456" });
    expect(result).toEqual({ error: "コードの有効期限が切れています！" });
  });

  it("deletes token, creates confirmation, and proceeds to signIn on valid code", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({
      ...verifiedUser,
      isTwoFactorEnabled: true,
    } as never);
    vi.mocked(getTwoFactorTokenByEmail).mockResolvedValue({
      id: "tt",
      token: "123456",
      expires: new Date(Date.now() + 60_000),
    } as never);
    vi.mocked(getTwoFactorConfirmationByUserId).mockResolvedValue(null);
    vi.mocked(signIn).mockResolvedValue(undefined as never);

    await login({ email: "a@b.com", password: "anything", code: "123456" });

    expect(db.twoFactorToken.delete).toHaveBeenCalledWith({ where: { id: "tt" } });
    expect(db.twoFactorConfirmation.create).toHaveBeenCalledWith({
      data: { userId: "u1" },
    });
    expect(signIn).toHaveBeenCalled();
  });

  it("deletes existing confirmation before creating a new one", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({
      ...verifiedUser,
      isTwoFactorEnabled: true,
    } as never);
    vi.mocked(getTwoFactorTokenByEmail).mockResolvedValue({
      id: "tt",
      token: "123456",
      expires: new Date(Date.now() + 60_000),
    } as never);
    vi.mocked(getTwoFactorConfirmationByUserId).mockResolvedValue({ id: "c-old" } as never);
    vi.mocked(signIn).mockResolvedValue(undefined as never);

    await login({ email: "a@b.com", password: "anything", code: "123456" });

    expect(db.twoFactorConfirmation.delete).toHaveBeenCalledWith({ where: { id: "c-old" } });
    expect(db.twoFactorConfirmation.create).toHaveBeenCalled();
  });
});

describe("login - signIn errors", () => {
  it("returns invalid credentials error when signIn throws CredentialsSignin", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(verifiedUser as never);
    vi.mocked(signIn).mockRejectedValue(new MockAuthError("CredentialsSignin"));

    const result = await login({ email: "a@b.com", password: "anything" });
    expect(result).toEqual({ error: "Emailかパスワードに間違いがあります！" });
  });

  it("returns generic error on other AuthError types", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(verifiedUser as never);
    vi.mocked(signIn).mockRejectedValue(new MockAuthError("Verification"));

    const result = await login({ email: "a@b.com", password: "anything" });
    expect(result).toEqual({ error: "エラーが発生しました。時間をおいて再度お試しください。" });
  });

  it("re-throws non-AuthError errors", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(verifiedUser as never);
    vi.mocked(signIn).mockRejectedValue(new Error("redirect"));

    await expect(login({ email: "a@b.com", password: "anything" })).rejects.toThrow("redirect");
  });
});
