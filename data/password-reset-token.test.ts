import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    passwordResetToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import {
  getPasswordResetTokenByEmail,
  getPasswordResetTokenByToken,
} from "./password-reset-token";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getPasswordResetTokenByToken", () => {
  it("returns token when found", async () => {
    const t = { id: "t1", token: "abc", email: "a@b.com" };
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(t as never);

    expect(await getPasswordResetTokenByToken("abc")).toEqual(t);
    expect(db.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { token: "abc" },
    });
  });

  it("returns null when Prisma throws", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockRejectedValue(new Error());
    expect(await getPasswordResetTokenByToken("x")).toBeNull();
  });
});

describe("getPasswordResetTokenByEmail", () => {
  it("returns token when found", async () => {
    const t = { id: "t1", token: "abc", email: "a@b.com" };
    vi.mocked(db.passwordResetToken.findFirst).mockResolvedValue(t as never);

    expect(await getPasswordResetTokenByEmail("a@b.com")).toEqual(t);
    expect(db.passwordResetToken.findFirst).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
    });
  });

  it("returns null when Prisma throws", async () => {
    vi.mocked(db.passwordResetToken.findFirst).mockRejectedValue(new Error());
    expect(await getPasswordResetTokenByEmail("x")).toBeNull();
  });
});
