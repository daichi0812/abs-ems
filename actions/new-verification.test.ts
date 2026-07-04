import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn() },
    verificationToken: { delete: vi.fn() },
  },
}));

vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

vi.mock("@/data/verification-token", () => ({
  getVerificationTokenByToken: vi.fn(),
}));

import { db } from "@/lib/db";
import { getUserByEmail } from "@/data/user";
import { getVerificationTokenByToken } from "@/data/verification-token";
import { newVerification } from "./new-verification";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("newVerification", () => {
  it("returns error when token does not exist", async () => {
    vi.mocked(getVerificationTokenByToken).mockResolvedValue(null);

    const result = await newVerification("tok");
    expect(result).toEqual({ error: "トークンが存在しません！" });
  });

  it("returns error when token has expired", async () => {
    vi.mocked(getVerificationTokenByToken).mockResolvedValue({
      id: "t1",
      email: "a@b.com",
      expires: new Date(Date.now() - 60_000),
    } as never);

    const result = await newVerification("tok");
    expect(result).toEqual({ error: "トークンの有効期限が切れています！" });
  });

  it("returns error when user does not exist", async () => {
    vi.mocked(getVerificationTokenByToken).mockResolvedValue({
      id: "t1",
      email: "a@b.com",
      expires: new Date(Date.now() + 60_000),
    } as never);
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const result = await newVerification("tok");
    expect(result).toEqual({ error: "存在しないメールアドレスです！" });
  });

  it("verifies email, deletes token, and returns success", async () => {
    vi.mocked(getVerificationTokenByToken).mockResolvedValue({
      id: "t1",
      email: "a@b.com",
      expires: new Date(Date.now() + 60_000),
    } as never);
    vi.mocked(getUserByEmail).mockResolvedValue({ id: "u1" } as never);

    const result = await newVerification("tok");

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { emailVerified: expect.any(Date), email: "a@b.com" },
    });
    expect(db.verificationToken.delete).toHaveBeenCalledWith({
      where: { id: "t1" },
    });
    expect(result).toEqual({ success: "メールアドレスが認証されました！" });
  });
});
