// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, currentUserMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { list: { findMany: findManyMock } },
}));
// GET はログイン必須。POST の hasManagerAccess 経由で currentRole も参照されうるため両方出す。
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
  currentRole: vi.fn(),
}));

import { GET } from "./route";

const getRequest = () => new Request("http://localhost/api/lists");

beforeEach(() => {
  findManyMock.mockReset();
  currentUserMock.mockReset();
});

describe("GET /api/lists", () => {
  it("returns 401 and does not query when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await GET(getRequest());

    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns the lists for an authenticated user", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER" });
    findManyMock.mockResolvedValue([{ id: 1, name: "Camera" }]);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalled();
  });
});
