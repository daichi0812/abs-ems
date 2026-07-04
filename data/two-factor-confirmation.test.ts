import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    twoFactorConfirmation: { findUnique: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { getTwoFactorConfirmationByUserId } from "./two-factor-confirmation";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getTwoFactorConfirmationByUserId", () => {
  it("returns confirmation when found", async () => {
    const c = { id: "c1", userId: "u1" };
    vi.mocked(db.twoFactorConfirmation.findUnique).mockResolvedValue(c as never);

    expect(await getTwoFactorConfirmationByUserId("u1")).toEqual(c);
    expect(db.twoFactorConfirmation.findUnique).toHaveBeenCalledWith({
      where: { userId: "u1" },
    });
  });

  it("returns null when Prisma throws", async () => {
    vi.mocked(db.twoFactorConfirmation.findUnique).mockRejectedValue(new Error());
    expect(await getTwoFactorConfirmationByUserId("u1")).toBeNull();
  });
});
