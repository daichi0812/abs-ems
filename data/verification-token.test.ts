import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    verificationToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import {
  getVerificationTokenByEmail,
  getVerificationTokenByToken,
} from "./verification-token";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getVerificationTokenByToken", () => {
  it("returns token when found", async () => {
    const t = { id: "t1", token: "abc", email: "a@b.com" };
    vi.mocked(db.verificationToken.findUnique).mockResolvedValue(t as never);

    expect(await getVerificationTokenByToken("abc")).toEqual(t);
    expect(db.verificationToken.findUnique).toHaveBeenCalledWith({
      where: { token: "abc" },
    });
  });

  it("returns null when Prisma throws", async () => {
    vi.mocked(db.verificationToken.findUnique).mockRejectedValue(new Error());
    expect(await getVerificationTokenByToken("x")).toBeNull();
  });
});

describe("getVerificationTokenByEmail", () => {
  it("returns token when found", async () => {
    const t = { id: "t1", token: "abc", email: "a@b.com" };
    vi.mocked(db.verificationToken.findFirst).mockResolvedValue(t as never);

    expect(await getVerificationTokenByEmail("a@b.com")).toEqual(t);
    expect(db.verificationToken.findFirst).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
    });
  });

  it("returns null when Prisma throws", async () => {
    vi.mocked(db.verificationToken.findFirst).mockRejectedValue(new Error());
    expect(await getVerificationTokenByEmail("x")).toBeNull();
  });
});
