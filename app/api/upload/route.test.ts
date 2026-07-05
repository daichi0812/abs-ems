// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { hasManagerAccessMock, putMock } = vi.hoisted(() => ({
  hasManagerAccessMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  hasManagerAccess: hasManagerAccessMock,
}));
// R2 バインディングは OpenNext の getCloudflareContext().env 経由で取得する。
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { IMAGES_BUCKET: { put: putMock } } }),
}));

import { POST } from "./route";

const BASE = "https://img.example.test";

// ハンドラは req.url / req.headers / req.arrayBuffer() しか使わないため、素の Request を NextRequest として渡す
const uploadRequest = (qs = "?filename=test.png") =>
  new Request(`http://localhost/api/upload${qs}`, {
    method: "POST",
    body: "data",
    headers: { "content-type": "image/png" },
  }) as unknown as NextRequest;

beforeEach(() => {
  hasManagerAccessMock.mockReset();
  putMock.mockReset();
  putMock.mockResolvedValue(undefined);
  process.env.R2_PUBLIC_BASE_URL = BASE;
});

afterEach(() => {
  delete process.env.R2_PUBLIC_BASE_URL;
});

describe("POST /api/upload", () => {
  it("returns 403 and does not upload without manager access", async () => {
    hasManagerAccessMock.mockResolvedValue(false);

    const res = await POST(uploadRequest());

    expect(res.status).toBe(403);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("returns 400 when filename is missing (even with manager access)", async () => {
    hasManagerAccessMock.mockResolvedValue(true);

    const res = await POST(uploadRequest(""));

    expect(res.status).toBe(400);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("returns 500 when R2_PUBLIC_BASE_URL is not configured", async () => {
    hasManagerAccessMock.mockResolvedValue(true);
    delete process.env.R2_PUBLIC_BASE_URL;

    const res = await POST(uploadRequest());

    expect(res.status).toBe(500);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("uploads to R2 with a unique key and returns the public url for a manager", async () => {
    hasManagerAccessMock.mockResolvedValue(true);

    const res = await POST(uploadRequest());

    expect(res.status).toBe(200);
    expect(putMock).toHaveBeenCalledTimes(1);

    // キーは `${uuid}-${filename}` 形式で一意化されている
    const [key, body, opts] = putMock.mock.calls[0];
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-test\.png$/);
    expect(body).toBeInstanceOf(ArrayBuffer);
    expect(opts).toMatchObject({ httpMetadata: { contentType: "image/png" } });

    // 応答は後方互換の { url }。カスタムドメイン + キーの絶対 URL。
    const responseBody = await res.json();
    expect(responseBody.url).toBe(`${BASE}/${key}`);
  });
});
