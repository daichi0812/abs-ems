// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock, updateMock, deleteMock, currentUserMock, hasManagerAccessMock } =
  vi.hoisted(() => ({
    findUniqueMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
    currentUserMock: vi.fn(),
    hasManagerAccessMock: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: { list: { findUnique: findUniqueMock, update: updateMock, delete: deleteMock } },
}));
// GET はログイン必須。PUT/DELETE の hasManagerAccess 経由で currentRole も参照されうるため両方出す。
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
  currentRole: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({
  hasManagerAccess: () => hasManagerAccessMock(),
}));

import { DELETE, GET, PUT } from "./route";

const getRequest = () => new Request("http://localhost/api/lists/5");
const putRequest = (body: Record<string, unknown> = { name: "Camera" }) =>
  new Request("http://localhost/api/lists/5", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const deleteRequest = () => new Request("http://localhost/api/lists/5", { method: "DELETE" });
const params = { params: Promise.resolve({ equipmentId: "5" }) };

// update/delete が対象なしで投げる Prisma エラー（事前 findUnique を省いた分、ここで 404 に落とす）
const p2025 = Object.assign(new Error("Record not found"), { code: "P2025" });

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  currentUserMock.mockReset();
  hasManagerAccessMock.mockReset();
  hasManagerAccessMock.mockResolvedValue(true);
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

describe("PUT /api/lists/[equipmentId]", () => {
  it("updates without a pre-check query", async () => {
    updateMock.mockResolvedValue({ id: 5, name: "Camera" });

    const res = await PUT(putRequest(), params);

    expect(res.status).toBe(200);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } }),
    );
  });

  it("maps P2025 (record not found) to 404", async () => {
    updateMock.mockRejectedValue(p2025);

    const res = await PUT(putRequest(), params);

    expect(res.status).toBe(404);
  });

  it("returns 403 without manager access", async () => {
    hasManagerAccessMock.mockResolvedValue(false);

    const res = await PUT(putRequest(), params);

    expect(res.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/lists/[equipmentId]", () => {
  it("deletes without a pre-check query", async () => {
    deleteMock.mockResolvedValue({ id: 5 });

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(200);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("maps P2025 (record not found) to 404", async () => {
    deleteMock.mockRejectedValue(p2025);

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(404);
  });
});
