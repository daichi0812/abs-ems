import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "next-auth/react";
import { useCurrentUser } from "./use-current-user";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useCurrentUser", () => {
  it("returns the user when session is present", () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1", name: "Taro", role: "USER" } },
      status: "authenticated",
    } as never);

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toEqual({ id: "u1", name: "Taro", role: "USER" });
  });

  it("returns undefined when session is null", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
    } as never);

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toBeUndefined();
  });
});
