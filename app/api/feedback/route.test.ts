// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, findManyMock, currentUserMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findManyMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { feedback: { create: createMock, findMany: findManyMock } },
}));
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));

import { GET, POST } from "./route";

const postRequest = (body: unknown) =>
  new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  createMock.mockReset();
  findManyMock.mockReset();
  currentUserMock.mockReset();
  vi.stubEnv("DEVELOPER_EMAILS", "dev@example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/feedback", () => {
  it("returns 401 when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await POST(postRequest({ body: "使いにくい" }));

    expect(res.status).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates feedback with the session user's id (body from client is not trusted for userId)", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", email: "member@example.com" });
    createMock.mockResolvedValue({ id: 1 });

    const res = await POST(postRequest({ body: "予約画面の◯◯が押しづらい", path: "/ems/mypage" }));

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      data: { userId: "u1", body: "予約画面の◯◯が押しづらい", path: "/ems/mypage" },
    });
  });

  it("rejects an empty body with 400", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", email: "member@example.com" });

    const res = await POST(postRequest({ body: "   " }));

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects a body over 2000 chars with 400", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", email: "member@example.com" });

    const res = await POST(postRequest({ body: "あ".repeat(2001) }));

    expect(res.status).toBe(400);
  });
});

describe("GET /api/feedback", () => {
  it("returns 403 for a non-developer (even ADMIN operators)", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", email: "president@example.com", role: "ADMIN" });

    const res = await GET();

    expect(res.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns the list for a developer email", async () => {
    currentUserMock.mockResolvedValue({ id: "u1", email: "dev@example.com" });
    findManyMock.mockResolvedValue([{ id: 1, body: "test", resolved: false }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalled();
  });

  it("returns 403 for everyone when DEVELOPER_EMAILS is unset", async () => {
    vi.stubEnv("DEVELOPER_EMAILS", "");
    currentUserMock.mockResolvedValue({ id: "u1", email: "dev@example.com" });

    const res = await GET();

    expect(res.status).toBe(403);
  });
});
