// @vitest-environment node
import moment from "moment-timezone";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
const createMock = vi.fn();
// findMany はファクトリ内で即時参照されるため vi.hoisted で初期化する
// （findFirst/create は $transaction 内の遅延参照なので通常の const で足りる）。
const { findManyMock } = vi.hoisted(() => ({ findManyMock: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    reserve: { findMany: findManyMock },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ reserve: { findFirst: findFirstMock, create: createMock } }),
    ),
  },
}));

import { GET, POST } from "./route";

const postRequest = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/reserves", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// バリデーションはJSTの「今日」を基準にするため、期待値も同じ式で計算してTZ非依存にする
const jstDate = (offsetDays: number) =>
  moment().tz("Asia/Tokyo").add(offsetDays, "days").format("YYYY-MM-DD");

const validBody = () => ({
  user_id: "u1",
  list_id: 1,
  start: jstDate(1),
  end: jstDate(3),
});

beforeEach(() => {
  findFirstMock.mockReset();
  createMock.mockReset();
  findManyMock.mockReset();
  findManyMock.mockResolvedValue([]);
});

describe("POST /api/reserves", () => {
  it("returns 400 when required fields are missing", async () => {
    const res = await POST(postRequest({ user_id: "u1", list_id: 1 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("必須項目が不足しています。");
  });

  it("returns 400 for malformed dates", async () => {
    const res = await POST(
      postRequest({ ...validBody(), start: "not-a-date", end: "also-bad" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("日付の形式が不正です。");
  });

  it("returns 400 when end is before start", async () => {
    const res = await POST(
      postRequest({ ...validBody(), start: jstDate(3), end: jstDate(1) }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("終了日は開始日以降にしてください。");
  });

  it("returns 400 when start is in the past (JST)", async () => {
    const res = await POST(
      postRequest({ ...validBody(), start: jstDate(-1), end: jstDate(1) }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("予約開始日は今日以降にしてください。");
  });

  it("returns 409 when the period overlaps an existing reserve", async () => {
    findFirstMock.mockResolvedValue({ id: 99 });

    const res = await POST(postRequest(validBody()));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("この期間にはすでに予約が入っています。");
    expect(createMock).not.toHaveBeenCalled();
    // 重複判定は inclusive（start <= 既存end AND end >= 既存start）
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        list_id: 1,
        start: { lte: new Date(jstDate(3) + "T00:00:00Z") },
        end: { gte: new Date(jstDate(1) + "T00:00:00Z") },
      },
    });
  });

  it("creates the reserve and returns 201 when the period is free", async () => {
    findFirstMock.mockResolvedValue(null);
    const created = { id: 1, ...validBody(), isRenting: 0 };
    createMock.mockResolvedValue(created);

    const res = await POST(postRequest(validBody()));

    expect(res.status).toBe(201);
    // "YYYY-MM-DD" 文字列は UTC 00:00 として保存される
    expect(createMock).toHaveBeenCalledWith({
      data: {
        user_id: "u1",
        list_id: 1,
        start: new Date(jstDate(1) + "T00:00:00Z"),
        end: new Date(jstDate(3) + "T00:00:00Z"),
        isRenting: 0,
      },
    });
  });

  it("extracts the JST date when an ISO datetime string is sent", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: 1 });

    // JST の (今日+1) 00:00 は UTC では前日 15:00
    const startJstDay = jstDate(1);
    const endJstDay = jstDate(2);
    const startIso = moment.tz(startJstDay, "Asia/Tokyo").toISOString();

    const res = await POST(
      postRequest({ user_id: "u1", list_id: 1, start: startIso, end: endJstDay }),
    );

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        start: new Date(startJstDay + "T00:00:00Z"),
        end: new Date(endJstDay + "T00:00:00Z"),
      }),
    });
  });
});

const getRequest = (qs = "") => new Request(`http://localhost/api/reserves${qs}`);

describe("GET /api/reserves", () => {
  it("returns all reserves (empty where) when no query params", async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith({ where: {} });
  });

  it("filters by user_id", async () => {
    await GET(getRequest("?user_id=u1"));
    expect(findManyMock).toHaveBeenCalledWith({ where: { user_id: "u1" } });
  });

  it("filters by list_id (number)", async () => {
    await GET(getRequest("?list_id=2"));
    expect(findManyMock).toHaveBeenCalledWith({ where: { list_id: 2 } });
  });

  it("combines user_id and list_id", async () => {
    await GET(getRequest("?user_id=u1&list_id=2"));
    expect(findManyMock).toHaveBeenCalledWith({ where: { user_id: "u1", list_id: 2 } });
  });

  it("treats an empty user_id as a zero-match filter, not all", async () => {
    await GET(getRequest("?user_id="));
    expect(findManyMock).toHaveBeenCalledWith({ where: { user_id: "" } });
  });

  it("returns 400 for a malformed list_id and does not query", async () => {
    const res = await GET(getRequest("?list_id=abc"));
    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  // 境界の現挙動を固定する（将来の呼び出し元向けドキュメント）
  it("treats an empty ?list_id= as list_id:0 (Number('') === 0)", async () => {
    await GET(getRequest("?list_id="));
    expect(findManyMock).toHaveBeenCalledWith({ where: { list_id: 0 } });
  });

  it("accepts a negative integer list_id", async () => {
    await GET(getRequest("?list_id=-5"));
    expect(findManyMock).toHaveBeenCalledWith({ where: { list_id: -5 } });
  });

  it("returns 400 for a decimal list_id and does not query", async () => {
    const res = await GET(getRequest("?list_id=2.5"));
    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
