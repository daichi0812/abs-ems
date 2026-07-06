// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

// PrismaClient の実接続を避け、インスタンスの同一性だけを検証する
vi.mock("@prisma/client", () => ({
  PrismaClient: class FakePrismaClient {
    id = Math.random();
  },
}));
vi.mock("@prisma/adapter-neon", () => ({
  PrismaNeon: class FakePrismaNeon {},
}));

import { getDb } from "./db";

// OpenNext が本番 Worker で定義するのと同じグローバルシンボル
const CTX = Symbol.for("__cloudflare-context__");
const originalNavigator = (globalThis as { navigator?: unknown }).navigator;

function setStore(store: object | undefined) {
  Object.defineProperty(globalThis, CTX, {
    configurable: true,
    get: () => store,
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, CTX);
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: originalNavigator,
  });
});

describe("getDb", () => {
  it("同一リクエスト（同一 store）内では同じクライアントを返す", () => {
    setStore({ env: {}, ctx: {}, cf: {} });

    const a = getDb();
    const b = getDb();

    expect(a).toBe(b);
  });

  it("リクエスト（store）が変わればクライアントも別になる", () => {
    setStore({ env: {}, ctx: {}, cf: {} });
    const a = getDb();
    setStore({ env: {}, ctx: {}, cf: {} });
    const b = getDb();

    expect(a).not.toBe(b);
  });

  it("ALS の外（Node 環境）ではプロセスワイド singleton を返す", () => {
    setStore(undefined);

    const a = getDb();
    const b = getDb();

    expect(a).toBe(b);
  });

  it("Workers 上で ALS の外に出た場合は共有せず都度生成する", () => {
    // リクエスト跨ぎの接続共有は Workers では実行時エラーになるため、安全側に倒す
    setStore(undefined);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { userAgent: "Cloudflare-Workers" },
    });

    const a = getDb();
    const b = getDb();

    expect(a).not.toBe(b);
  });
});
