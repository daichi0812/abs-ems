// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteManyMock, currentUserMock } = vi.hoisted(() => ({
  deleteManyMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { reserve: { findMany: vi.fn(), deleteMany: deleteManyMock } },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

import { DELETE } from "./route";

const deleteRequest = () =>
  new Request("http://localhost/api/reserves/5", { method: "DELETE" });
const params = { params: Promise.resolve({ reserveId: "5" }) };

beforeEach(() => {
  deleteManyMock.mockReset();
  currentUserMock.mockReset();
});

describe("DELETE /api/reserves/[reserveId]", () => {
  it("returns 401 when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(401);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("scopes deletion to the requesting user's own reserves", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER" });
    deleteManyMock.mockResolvedValue({ count: 1 });

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(200);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: 5, user_id: "u1" },
    });
  });

  it("lets an ADMIN delete any reserve", async () => {
    currentUserMock.mockResolvedValue({ id: "admin1", role: "ADMIN" });
    deleteManyMock.mockResolvedValue({ count: 1 });

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(200);
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("returns 404 when nothing was deleted (missing or someone else's reserve)", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER" });
    deleteManyMock.mockResolvedValue({ count: 0 });

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("予約が見つかりません。");
  });

  it("returns 400 for a non-numeric id", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER" });

    const res = await DELETE(deleteRequest(), {
      params: Promise.resolve({ reserveId: "abc" }),
    });

    expect(res.status).toBe(400);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });
});
