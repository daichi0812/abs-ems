import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiMutate, ApiMutateError } from "./api-mutate";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiMutate", () => {
  it("JSON ボディ付きで Content-Type を立てて送る", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await apiMutate("/api/tags", { method: "POST", body: { name: "x" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tags");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ name: "x" });
  });

  it("ボディ無しでは Content-Type も body も付けない", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await apiMutate("/api/tags/5", { method: "DELETE" });

    const [, init] = fetchMock.mock.calls[0];
    expect(init).toEqual({ method: "DELETE", headers: {} });
  });

  it("成功時（res.ok）は json を読まず解決する", async () => {
    // json を持たない最小モックでも成功パスは通る
    fetchMock.mockResolvedValue({ ok: true });
    await expect(
      apiMutate("/api/x", { method: "POST", body: {} })
    ).resolves.toBeUndefined();
  });

  it("失敗時はサーバーの error 文言を載せた ApiMutateError を投げる", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "重複しています" }),
    });
    await expect(apiMutate("/api/x", { method: "POST" })).rejects.toMatchObject({
      message: "重複しています",
      status: 409,
    });
  });

  it("error 文言が無ければ HTTP ステータスを message にする", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(apiMutate("/api/x", { method: "POST" })).rejects.toBeInstanceOf(
      ApiMutateError
    );
    await expect(
      apiMutate("/api/x", { method: "POST" })
    ).rejects.toMatchObject({ message: "HTTP 500" });
  });
});
