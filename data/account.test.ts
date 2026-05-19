import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { account: { findFirst: vi.fn() } },
}));

import { db } from "@/lib/db";
import { getAccountByUserId } from "./account";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getAccountByUserId", () => {
  it("returns the account when found", async () => {
    const account = { id: "acc1", userId: "u1", provider: "google" };
    vi.mocked(db.account.findFirst).mockResolvedValue(account as never);

    const result = await getAccountByUserId("u1");

    expect(result).toEqual(account);
    expect(db.account.findFirst).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });

  it("returns null when Prisma throws", async () => {
    vi.mocked(db.account.findFirst).mockRejectedValue(new Error("db down"));
    expect(await getAccountByUserId("u1")).toBeNull();
  });

  it("returns null when account not found", async () => {
    vi.mocked(db.account.findFirst).mockResolvedValue(null);
    expect(await getAccountByUserId("u1")).toBeNull();
  });
});
