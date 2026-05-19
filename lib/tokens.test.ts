import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    verificationToken: { create: vi.fn(), delete: vi.fn() },
    passwordResetToken: { create: vi.fn(), delete: vi.fn() },
    twoFactorToken: { create: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("@/data/verification-token", () => ({
  getVerificationTokenByEmail: vi.fn(),
}));
vi.mock("@/data/password-reset-token", () => ({
  getPasswordResetTokenByEmail: vi.fn(),
}));
vi.mock("@/data/two-factor-token", () => ({
  getTwoFactorTokenByEmail: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "stub-uuid"),
}));

import { db } from "@/lib/db";
import { getVerificationTokenByEmail } from "@/data/verification-token";
import { getPasswordResetTokenByEmail } from "@/data/password-reset-token";
import { getTwoFactorTokenByEmail } from "@/data/two-factor-token";
import {
  generatePasswordResetToken,
  generateTwoFactorToken,
  generateVerificationToken,
} from "./tokens";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("generateVerificationToken", () => {
  it("creates a new token with uuid and 1-hour expiry when none exists", async () => {
    vi.mocked(getVerificationTokenByEmail).mockResolvedValue(null);
    const created = { id: "new1", email: "a@b.com", token: "stub-uuid", expires: new Date() };
    vi.mocked(db.verificationToken.create).mockResolvedValue(created as never);

    const result = await generateVerificationToken("a@b.com");

    expect(db.verificationToken.delete).not.toHaveBeenCalled();
    expect(db.verificationToken.create).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(db.verificationToken.create).mock.calls[0]?.[0];
    expect(callArgs?.data.email).toBe("a@b.com");
    expect(callArgs?.data.token).toBe("stub-uuid");
    expect(result).toEqual(created);
  });

  it("deletes existing token before creating a new one", async () => {
    vi.mocked(getVerificationTokenByEmail).mockResolvedValue({
      id: "old",
      email: "a@b.com",
      token: "prev",
      expires: new Date(),
    } as never);
    vi.mocked(db.verificationToken.create).mockResolvedValue({} as never);

    await generateVerificationToken("a@b.com");

    expect(db.verificationToken.delete).toHaveBeenCalledWith({ where: { id: "old" } });
    expect(db.verificationToken.create).toHaveBeenCalledOnce();
  });

  it("sets expiry roughly 1 hour in the future", async () => {
    vi.mocked(getVerificationTokenByEmail).mockResolvedValue(null);
    vi.mocked(db.verificationToken.create).mockResolvedValue({} as never);

    const before = Date.now();
    await generateVerificationToken("a@b.com");
    const after = Date.now();

    const callArgs = vi.mocked(db.verificationToken.create).mock.calls[0]?.[0];
    const expires = callArgs?.data.expires as Date;
    expect(expires.getTime()).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + 3600 * 1000);
  });
});

describe("generatePasswordResetToken", () => {
  it("creates a new token when none exists", async () => {
    vi.mocked(getPasswordResetTokenByEmail).mockResolvedValue(null);
    const created = { id: "new1", email: "a@b.com", token: "stub-uuid", expires: new Date() };
    vi.mocked(db.passwordResetToken.create).mockResolvedValue(created as never);

    const result = await generatePasswordResetToken("a@b.com");

    expect(db.passwordResetToken.delete).not.toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it("deletes existing token before creating a new one", async () => {
    vi.mocked(getPasswordResetTokenByEmail).mockResolvedValue({
      id: "old",
      email: "a@b.com",
      token: "prev",
      expires: new Date(),
    } as never);
    vi.mocked(db.passwordResetToken.create).mockResolvedValue({} as never);

    await generatePasswordResetToken("a@b.com");

    expect(db.passwordResetToken.delete).toHaveBeenCalledWith({ where: { id: "old" } });
  });
});

describe("generateTwoFactorToken", () => {
  it("creates a 6-digit numeric token when none exists", async () => {
    vi.mocked(getTwoFactorTokenByEmail).mockResolvedValue(null);
    vi.mocked(db.twoFactorToken.create).mockResolvedValue({} as never);

    await generateTwoFactorToken("a@b.com");

    expect(db.twoFactorToken.delete).not.toHaveBeenCalled();
    const callArgs = vi.mocked(db.twoFactorToken.create).mock.calls[0]?.[0];
    const token = callArgs?.data.token as string;
    expect(token).toMatch(/^\d{6}$/);
  });

  it("deletes existing token before creating a new one", async () => {
    vi.mocked(getTwoFactorTokenByEmail).mockResolvedValue({
      id: "old",
      email: "a@b.com",
      token: "111111",
      expires: new Date(),
    } as never);
    vi.mocked(db.twoFactorToken.create).mockResolvedValue({} as never);

    await generateTwoFactorToken("a@b.com");

    expect(db.twoFactorToken.delete).toHaveBeenCalledWith({ where: { id: "old" } });
  });

  it("sets expiry roughly 5 minutes in the future", async () => {
    vi.mocked(getTwoFactorTokenByEmail).mockResolvedValue(null);
    vi.mocked(db.twoFactorToken.create).mockResolvedValue({} as never);

    const before = Date.now();
    await generateTwoFactorToken("a@b.com");
    const after = Date.now();

    const callArgs = vi.mocked(db.twoFactorToken.create).mock.calls[0]?.[0];
    const expires = callArgs?.data.expires as Date;
    expect(expires.getTime()).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + 5 * 60 * 1000);
  });
});
