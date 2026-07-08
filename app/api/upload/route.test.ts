// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { currentUserMock, membershipFindUniqueMock, putMock } = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  putMock: vi.fn(),
}));

// requireWorkspaceManager は currentUser() と membership の DB 再検証で判定する
// （lists/tags のルートテストと同じ mock 構成）。
vi.mock("@/lib/auth", () => ({
  currentUser: () => currentUserMock(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    membership: { findUnique: membershipFindUniqueMock },
  },
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
  currentUserMock.mockReset();
  membershipFindUniqueMock.mockReset();
  putMock.mockReset();
  putMock.mockResolvedValue(undefined);
  // 既定はワークスペースの ADMIN（管理者）としてログイン済み
  currentUserMock.mockResolvedValue({ id: "u1", currentWorkspaceId: "ws1" });
  membershipFindUniqueMock.mockResolvedValue({ role: "ADMIN" });
  process.env.R2_PUBLIC_BASE_URL = BASE;
});

afterEach(() => {
  delete process.env.R2_PUBLIC_BASE_URL;
});

describe("POST /api/upload", () => {
  it("returns 401 and does not upload when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);

    const res = await POST(uploadRequest());

    expect(res.status).toBe(401);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("returns 403 and does not upload for a MEMBER (non-manager role)", async () => {
    membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });

    const res = await POST(uploadRequest());

    expect(res.status).toBe(403);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("returns 400 when filename is missing (even for a manager)", async () => {
    const res = await POST(uploadRequest(""));

    expect(res.status).toBe(400);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("returns 500 when R2_PUBLIC_BASE_URL is not configured", async () => {
    delete process.env.R2_PUBLIC_BASE_URL;

    const res = await POST(uploadRequest());

    expect(res.status).toBe(500);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("uploads to R2 with a unique key and returns the public url for a manager", async () => {
    const res = await POST(uploadRequest());

    expect(res.status).toBe(200);
    expect(putMock).toHaveBeenCalledTimes(1);

    // キーは `${uuid}-${filename}` 形式で一意化されている
    const [key, body, opts] = putMock.mock.calls[0];
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-test\.png$/);
    expect(body).toBeInstanceOf(ArrayBuffer);
    // toEqual で固定: キーは UUID 付きで不変なので immutable キャッシュが前提。
    // ここが落ちる（キー名 typo・指定漏れ）と機材サムネイルが毎回オリジンまで
    // 往復する静かな性能回帰になるため、追加キーを素通しする toMatchObject にしない。
    expect(opts.httpMetadata).toEqual({
      contentType: "image/png",
      cacheControl: "public, max-age=31536000, immutable",
    });

    // 応答は後方互換の { url }。カスタムドメイン + キーの絶対 URL。
    const responseBody = await res.json();
    expect(responseBody.url).toBe(`${BASE}/${key}`);
  });
});
