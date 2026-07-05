// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { hasManagerAccessMock, putMock } = vi.hoisted(() => ({
  hasManagerAccessMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  hasManagerAccess: hasManagerAccessMock,
}));
vi.mock("@vercel/blob", () => ({
  put: putMock,
}));

import { POST } from "./route";

// ハンドラは req.url / req.blob() しか使わないため、素の Request を NextRequest として渡す
const uploadRequest = (qs = "?filename=test.png") =>
  new Request(`http://localhost/api/upload${qs}`, {
    method: "POST",
    body: "data",
  }) as unknown as NextRequest;

beforeEach(() => {
  hasManagerAccessMock.mockReset();
  putMock.mockReset();
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

  it("uploads and returns the blob for a manager", async () => {
    hasManagerAccessMock.mockResolvedValue(true);
    putMock.mockResolvedValue({ url: "https://blob/test.png" });

    const res = await POST(uploadRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://blob/test.png");
    expect(putMock).toHaveBeenCalledWith(
      "test.png",
      expect.anything(),
      expect.objectContaining({ access: "public", addRandomSuffix: true }),
    );
  });
});
