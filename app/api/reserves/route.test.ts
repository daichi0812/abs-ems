// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
const createMock = vi.fn();
// findMany / list.findFirst / membership.findUnique / currentUser はファクトリ内で
// 即時参照されるため vi.hoisted で初期化する
// （findFirst/create は $transaction 内の遅延参照なので通常の const で足りる）。
const { findManyMock, listFindFirstMock, membershipFindUniqueMock, currentUserMock } =
  vi.hoisted(() => ({
    findManyMock: vi.fn(),
    listFindFirstMock: vi.fn(),
    membershipFindUniqueMock: vi.fn(),
    currentUserMock: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    reserve: { findMany: findManyMock },
    list: { findFirst: listFindFirstMock },
    membership: { findUnique: membershipFindUniqueMock },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ reserve: { findFirst: findFirstMock, create: createMock } }),
    ),
  },
}));

// GET はワークスペース所属メンバー必須。既定では認証済み＋所属ありを返し、
// 未認証・所属なしケースは個別に上書きする。
vi.mock("@/lib/auth", () => ({
  currentUser: currentUserMock,
}));

// 通知はバックグラウンド副作用なので、ルートの契約テストでは無効化する。
vi.mock("@/lib/notify", () => ({
  notifyInBackground: vi.fn(),
  notifyReservationCreated: vi.fn(),
}));

import { GET, POST } from "./route";

const postRequest = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/reserves", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// バリデーションはJSTの「今日」を基準にするため、期待値も同じ式で計算してTZ非依存にする
// （日本にDSTはないので「ms加算→JSTで整形」は日単位の加算と等価）
const jstDate = (offsetDays: number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));

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
  // 既定は「機材は現在のワークスペースに存在する」。他団体機材ケースは各テストで上書き。
  listFindFirstMock.mockReset();
  listFindFirstMock.mockResolvedValue({ id: 1 });
  // 既定はワークスペース所属あり（MEMBER）。所属なしは各テストで上書き。
  membershipFindUniqueMock.mockReset();
  membershipFindUniqueMock.mockResolvedValue({ role: "MEMBER" });
  // 既定はログイン済み（GET テストの大半はこの前提）。未認証は各テストで上書き。
  currentUserMock.mockReset();
  currentUserMock.mockResolvedValue({ id: "tester", role: "USER", currentWorkspaceId: "ws1" });
});

describe("POST /api/reserves", () => {
  it("returns 401 and does not create when unauthenticated", async () => {
    currentUserMock.mockResolvedValueOnce(undefined);
    const res = await POST(postRequest(validBody()));
    expect(res.status).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 403 and does not create when not a workspace member", async () => {
    membershipFindUniqueMock.mockResolvedValue(null);
    const res = await POST(postRequest(validBody()));
    expect(res.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("ignores body user_id and uses the session user (anti-spoof)", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: 2 });
    currentUserMock.mockResolvedValue({ id: "attacker", role: "USER", currentWorkspaceId: "ws1" });

    // 攻撃者が body で他人(victim)を詐称しても、作成される user_id はセッション(attacker)。
    const res = await POST(postRequest({ ...validBody(), user_id: "victim" }));

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ user_id: "attacker" }),
      }),
    );
  });

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

  it("returns 404 when the equipment belongs to another workspace", async () => {
    // 機材の所有確認は workspaceId 込みの where で行う（他団体の機材 id を指定した越境予約防止）。
    listFindFirstMock.mockResolvedValue(null);

    const res = await POST(postRequest(validBody()));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("機材が見つかりません。");
    expect(listFindFirstMock).toHaveBeenCalledWith({
      where: { id: 1, workspaceId: "ws1" },
      select: { id: true },
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the period overlaps an existing reserve", async () => {
    findFirstMock.mockResolvedValue({ id: 99 });

    const res = await POST(postRequest(validBody()));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("この期間にはすでに予約が入っています。");
    expect(createMock).not.toHaveBeenCalled();
    // 重複判定は inclusive（start <= 既存end AND end >= 既存start）で、常にワークスペース内に限る。
    // 返却済(4)は機材が手元に戻っているので空き扱い（早期返却で残り期間を解放する）。
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws1",
        list_id: 1,
        isRenting: { not: 4 },
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
    // user_id は body("u1")ではなくセッション("tester")から入る。"YYYY-MM-DD" は UTC 00:00 保存。
    // workspaceId はセッションのワークスペースが入る。
    expect(createMock).toHaveBeenCalledWith({
      data: {
        user_id: "tester",
        list_id: 1,
        start: new Date(jstDate(1) + "T00:00:00Z"),
        end: new Date(jstDate(3) + "T00:00:00Z"),
        isRenting: 0,
        workspaceId: "ws1",
      },
    });
  });

  it("extracts the JST date when an ISO datetime string is sent", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: 1 });

    // JST の (今日+1) 00:00 は UTC では前日 15:00
    const startJstDay = jstDate(1);
    const endJstDay = jstDate(2);
    const startIso = new Date(`${startJstDay}T00:00:00+09:00`).toISOString();

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
  it("returns 401 and does not query the DB when unauthenticated", async () => {
    currentUserMock.mockResolvedValueOnce(undefined);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 403 and does not query the DB when not a workspace member", async () => {
    membershipFindUniqueMock.mockResolvedValue(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns all reserves in the workspace when no query params", async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    // クエリ無しでも常に現在のワークスペースでフィルタし、他団体の予約は返さない。
    expect(findManyMock).toHaveBeenCalledWith({ where: { workspaceId: "ws1" } });
  });

  it("filters by user_id", async () => {
    await GET(getRequest("?user_id=u1"));
    expect(findManyMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", user_id: "u1" },
    });
  });

  it("filters by list_id (number)", async () => {
    await GET(getRequest("?list_id=2"));
    expect(findManyMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", list_id: 2 },
    });
  });

  it("combines user_id and list_id", async () => {
    await GET(getRequest("?user_id=u1&list_id=2"));
    expect(findManyMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", user_id: "u1", list_id: 2 },
    });
  });

  it("treats an empty user_id as a zero-match filter, not all", async () => {
    await GET(getRequest("?user_id="));
    expect(findManyMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", user_id: "" },
    });
  });

  it("returns 400 for a malformed list_id and does not query", async () => {
    const res = await GET(getRequest("?list_id=abc"));
    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  // 境界の現挙動を固定する（将来の呼び出し元向けドキュメント）
  it("treats an empty ?list_id= as list_id:0 (Number('') === 0)", async () => {
    await GET(getRequest("?list_id="));
    expect(findManyMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", list_id: 0 },
    });
  });

  it("accepts a negative integer list_id", async () => {
    await GET(getRequest("?list_id=-5"));
    expect(findManyMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", list_id: -5 },
    });
  });

  it("returns 400 for a decimal list_id and does not query", async () => {
    const res = await GET(getRequest("?list_id=2.5"));
    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  // 期間フィルタ（保存値は「JST日付の UTC 00:00」なので同じ座標系で比較する）
  it("filters by from (end >= from) for availability queries", async () => {
    await GET(getRequest("?from=2026-07-06"));
    expect(findManyMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", end: { gte: new Date("2026-07-06T00:00:00Z") } },
    });
  });

  it("filters by to (start <= to)", async () => {
    await GET(getRequest("?to=2026-07-31"));
    expect(findManyMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", start: { lte: new Date("2026-07-31T00:00:00Z") } },
    });
  });

  it("combines from/to with user_id", async () => {
    await GET(getRequest("?user_id=u1&from=2026-07-01&to=2026-07-31"));
    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws1",
        user_id: "u1",
        end: { gte: new Date("2026-07-01T00:00:00Z") },
        start: { lte: new Date("2026-07-31T00:00:00Z") },
      },
    });
  });

  it("returns 400 for a malformed from and does not query", async () => {
    const res = await GET(getRequest("?from=2026/07/06"));
    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a calendar-invalid from (month 13) instead of 500", async () => {
    // 正規表現は桁数しか見ないため、Invalid Date が Prisma まで届いて 500 になっていた
    const res = await GET(getRequest("?from=2026-13-01"));
    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a rollover date (Feb 30) instead of silently shifting to Mar 2", async () => {
    const res = await GET(getRequest("?from=2026-02-30"));
    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed to and does not query", async () => {
    const res = await GET(getRequest("?to=notadate"));
    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
