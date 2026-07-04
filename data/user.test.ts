import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { getUserByEmail, getUserById } from "./user";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getUserByEmail", () => {
  it("returns the user when found", async () => {
    const user = { id: "1", email: "a@b.com" };
    vi.mocked(db.user.findUnique).mockResolvedValue(user as never);

    const result = await getUserByEmail("a@b.com");

    expect(result).toEqual(user);
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
    });
  });

  it("returns null when Prisma throws", async () => {
    vi.mocked(db.user.findUnique).mockRejectedValue(new Error("db down"));

    const result = await getUserByEmail("a@b.com");

    expect(result).toBeNull();
  });

  it("returns null when user not found", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const result = await getUserByEmail("missing@b.com");

    expect(result).toBeNull();
  });
});

describe("getUserById", () => {
  it("returns the user when found", async () => {
    const user = { id: "42", email: "x@y.com" };
    vi.mocked(db.user.findUnique).mockResolvedValue(user as never);

    const result = await getUserById("42");

    expect(result).toEqual(user);
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: "42" } });
  });

  it("returns null when Prisma throws", async () => {
    vi.mocked(db.user.findUnique).mockRejectedValue(new Error("db down"));

    const result = await getUserById("42");

    expect(result).toBeNull();
  });
});
