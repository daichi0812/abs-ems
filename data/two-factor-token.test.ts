import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    twoFactorToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import {
  getTwoFactorTokenByEmail,
  getTwoFactorTokenByToken,
} from "./two-factor-token";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getTwoFactorTokenByToken", () => {
  it("returns token when found", async () => {
    const t = { id: "t1", token: "123456", email: "a@b.com" };
    vi.mocked(db.twoFactorToken.findUnique).mockResolvedValue(t as never);

    expect(await getTwoFactorTokenByToken("123456")).toEqual(t);
    expect(db.twoFactorToken.findUnique).toHaveBeenCalledWith({
      where: { token: "123456" },
    });
  });

  it("returns null when Prisma throws", async () => {
    vi.mocked(db.twoFactorToken.findUnique).mockRejectedValue(new Error());
    expect(await getTwoFactorTokenByToken("x")).toBeNull();
  });
});

describe("getTwoFactorTokenByEmail", () => {
  it("returns token when found", async () => {
    const t = { id: "t1", token: "123456", email: "a@b.com" };
    vi.mocked(db.twoFactorToken.findFirst).mockResolvedValue(t as never);

    expect(await getTwoFactorTokenByEmail("a@b.com")).toEqual(t);
    expect(db.twoFactorToken.findFirst).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
    });
  });

  it("returns null when Prisma throws", async () => {
    vi.mocked(db.twoFactorToken.findFirst).mockRejectedValue(new Error());
    expect(await getTwoFactorTokenByEmail("x")).toBeNull();
  });
});
