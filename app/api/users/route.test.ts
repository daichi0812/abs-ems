// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, currentUserMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { user: { findMany: findManyMock } },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

import { GET } from "./route";

const getRequest = () => new Request("http://localhost/api/users");

beforeEach(() => {
  findManyMock.mockReset();
  currentUserMock.mockReset();
});

describe("GET /api/users", () => {
  it("returns 401 and does not query when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await GET(getRequest());

    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns only id/name for an authenticated user", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER" });
    findManyMock.mockResolvedValue([{ id: "u1", name: "Taro" }]);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    // password/email を出さない列制限を固定する
    expect(findManyMock).toHaveBeenCalledWith({ select: { id: true, name: true } });
  });
});
