// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

const currentRoleMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ currentRole: currentRoleMock }));

import { hasManagerAccess } from "./api-auth";
import { MANAGER_KEY_HEADER } from "./manager-auth";

// test/setup.ts で NEXT_PUBLIC_MANAGER_KEY = "test-manager-key"
const req = (key?: string) =>
  new Request("http://localhost/api/tags", {
    headers: key ? { [MANAGER_KEY_HEADER]: key } : {},
  });

beforeEach(() => {
  currentRoleMock.mockReset();
});

describe("hasManagerAccess", () => {
  it("allows an ADMIN regardless of the key", async () => {
    currentRoleMock.mockResolvedValue(UserRole.ADMIN);
    expect(await hasManagerAccess(req())).toBe(true);
  });

  it("allows a non-admin carrying the correct manager key", async () => {
    currentRoleMock.mockResolvedValue(UserRole.USER);
    expect(await hasManagerAccess(req("test-manager-key"))).toBe(true);
  });

  it("rejects a non-admin with a wrong key", async () => {
    currentRoleMock.mockResolvedValue(UserRole.USER);
    expect(await hasManagerAccess(req("wrong-key"))).toBe(false);
  });

  it("rejects a non-admin with no key", async () => {
    currentRoleMock.mockResolvedValue(UserRole.USER);
    expect(await hasManagerAccess(req())).toBe(false);
  });

  it("rejects an unauthenticated request with no key", async () => {
    currentRoleMock.mockResolvedValue(undefined);
    expect(await hasManagerAccess(req())).toBe(false);
  });
});
