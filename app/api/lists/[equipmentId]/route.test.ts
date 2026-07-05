// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock, currentUserMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { list: { findUnique: findUniqueMock } },
}));
// GET はログイン必須。PUT/DELETE の hasManagerAccess 経由で currentRole も参照されうるため両方出す。
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
  currentRole: vi.fn(),
}));

import { GET } from "./route";

const getRequest = () => new Request("http://localhost/api/lists/5");
const params = { params: Promise.resolve({ equipmentId: "5" }) };

beforeEach(() => {
  findUniqueMock.mockReset();
  currentUserMock.mockReset();
});

describe("GET /api/lists/[equipmentId]", () => {
  it("returns 401 and does not query when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await GET(getRequest(), params);

    expect(res.status).toBe(401);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns the equipment for an authenticated user", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER" });
    findUniqueMock.mockResolvedValue({ id: 5, name: "Camera" });

    const res = await GET(getRequest(), params);

    expect(res.status).toBe(200);
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("returns 404 when the equipment does not exist", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", role: "USER" });
    findUniqueMock.mockResolvedValue(null);

    const res = await GET(getRequest(), params);

    expect(res.status).toBe(404);
  });
});
