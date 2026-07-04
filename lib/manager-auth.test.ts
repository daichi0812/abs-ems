import { afterEach, describe, expect, it, vi } from "vitest";
import { MANAGER_KEY_HEADER, managerAuthHeaders } from "./manager-auth";

afterEach(() => {
  // 他テストへ影響しないよう setup.ts の値に戻す
  vi.stubEnv("NEXT_PUBLIC_MANAGER_KEY", "test-manager-key");
});

describe("managerAuthHeaders", () => {
  it("returns the manager key header when the env var is set", () => {
    expect(managerAuthHeaders()).toEqual({ [MANAGER_KEY_HEADER]: "test-manager-key" });
  });

  it("returns an empty object when the key is unset (ADMIN needs no key)", () => {
    vi.stubEnv("NEXT_PUBLIC_MANAGER_KEY", "");
    expect(managerAuthHeaders()).toEqual({});
  });
});
