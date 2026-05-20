import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "next-auth/react";
import { useCurrentRole } from "./use-current-role";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useCurrentRole", () => {
  it("returns the role when session is present", () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1", role: "ADMIN" } },
      status: "authenticated",
    } as never);

    const { result } = renderHook(() => useCurrentRole());

    expect(result.current).toBe("ADMIN");
  });

  it("returns undefined when session is null", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
    } as never);

    const { result } = renderHook(() => useCurrentRole());

    expect(result.current).toBeUndefined();
  });
});
