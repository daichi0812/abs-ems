// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, updateMock, notifyReturnReminderMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  updateMock: vi.fn(),
  notifyReturnReminderMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { reserve: { findMany: findManyMock, update: updateMock } },
}));
vi.mock("@/lib/notify", () => ({
  notifyReturnReminder: notifyReturnReminderMock,
}));

import { GET } from "./route";

const req = (auth?: string) =>
  new Request("http://localhost/api/cron/return-reminders", {
    headers: auth ? { authorization: auth } : {},
  });

const prevSecret = process.env.CRON_SECRET;

beforeEach(() => {
  findManyMock.mockReset();
  updateMock.mockReset().mockResolvedValue({});
  notifyReturnReminderMock.mockReset().mockResolvedValue(undefined);
  process.env.CRON_SECRET = "s3cret";
});
afterEach(() => {
  process.env.CRON_SECRET = prevSecret;
});

describe("GET /api/cron/return-reminders", () => {
  it("rejects requests without the correct secret", async () => {
    const res = await GET(req("Bearer wrong"));
    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("rejects when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(401);
  });

  it("notifies each due reserve and marks it reminded", async () => {
    findManyMock.mockResolvedValue([
      { id: 1, user_id: "u1", list_id: 10, start: null, end: new Date("2026-07-06T00:00:00Z") },
      { id: 2, user_id: "u2", list_id: 11, start: null, end: new Date("2026-07-06T00:00:00Z") },
    ]);

    const res = await GET(req("Bearer s3cret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(notifyReturnReminderMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(body).toMatchObject({ targeted: 2, sent: 2, failed: 0 });
  });

  it("keeps going when one send fails and reports the failure count", async () => {
    findManyMock.mockResolvedValue([
      { id: 1, user_id: "u1", list_id: 10, start: null, end: new Date("2026-07-06T00:00:00Z") },
      { id: 2, user_id: "u2", list_id: 11, start: null, end: new Date("2026-07-06T00:00:00Z") },
    ]);
    notifyReturnReminderMock.mockRejectedValueOnce(new Error("send failed"));

    const res = await GET(req("Bearer s3cret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ targeted: 2, sent: 1, failed: 1 });
    // 失敗した1件は reminded_on を更新しない（翌回の再送を許す）。
    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});
