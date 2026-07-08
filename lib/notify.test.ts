// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  sendMock,
  waitUntilMock,
  getCtxMock,
  userFindUniqueMock,
  listFindUniqueMock,
  userSettingsFindManyMock,
  membershipFindManyMock,
} = vi.hoisted(() => ({
  sendMock: vi.fn(),
  waitUntilMock: vi.fn(),
  getCtxMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  listFindUniqueMock: vi.fn(),
  userSettingsFindManyMock: vi.fn(),
  membershipFindManyMock: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => getCtxMock(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: userFindUniqueMock },
    list: { findUnique: listFindUniqueMock },
    userSettings: { findMany: userSettingsFindManyMock },
    membership: { findMany: membershipFindManyMock },
  },
}));

import {
  formatReserveDate,
  notifyUser,
  notifyInBackground,
  notifyNewEquipment,
} from "./notify";

const okCtx = () => ({ env: { EMAIL: { send: sendMock } }, ctx: { waitUntil: waitUntilMock } });

beforeEach(() => {
  sendMock.mockReset().mockResolvedValue({ messageId: "m1" });
  waitUntilMock.mockReset();
  getCtxMock.mockReset().mockReturnValue(okCtx());
  userFindUniqueMock.mockReset();
  listFindUniqueMock.mockReset();
  userSettingsFindManyMock.mockReset();
  membershipFindManyMock.mockReset().mockResolvedValue([]);
});

describe("formatReserveDate", () => {
  it("formats the stored UTC-midnight date as its JST calendar date", () => {
    expect(formatReserveDate(new Date("2026-07-06T00:00:00Z"))).toBe("2026/07/06");
  });
  it("returns a dash for null", () => {
    expect(formatReserveDate(null)).toBe("-");
  });
});

describe("notifyUser", () => {
  const msg = { subject: "s", html: "<p>h</p>", text: "t" };

  it("sends when the matching toggle is enabled", async () => {
    userFindUniqueMock.mockResolvedValue({
      email: "a@example.com",
      settings: { notifyReturnReminder: true, notifyReservationEvents: true, notifyNewEquipment: false },
    });

    await notifyUser("u1", "reservationEvents", msg);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toMatchObject({ to: "a@example.com", subject: "s" });
  });

  it("does not send when the matching toggle is disabled", async () => {
    userFindUniqueMock.mockResolvedValue({
      email: "a@example.com",
      settings: { notifyReturnReminder: true, notifyReservationEvents: false, notifyNewEquipment: false },
    });

    await notifyUser("u1", "reservationEvents", msg);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("falls back to defaults when no settings row exists (events default true)", async () => {
    userFindUniqueMock.mockResolvedValue({ email: "a@example.com", settings: null });

    await notifyUser("u1", "reservationEvents", msg);

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("skips newEquipment by default when no settings row exists", async () => {
    userFindUniqueMock.mockResolvedValue({ email: "a@example.com", settings: null });

    await notifyUser("u1", "newEquipment", msg);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips users without an email", async () => {
    userFindUniqueMock.mockResolvedValue({ email: null, settings: null });

    await notifyUser("u1", "returnReminder", msg);

    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("notifyNewEquipment", () => {
  it("sends to every opted-in member with an email", async () => {
    membershipFindManyMock.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    userSettingsFindManyMock.mockResolvedValue([
      { user: { email: "a@example.com" } },
      { user: { email: "b@example.com" } },
    ]);

    await notifyNewEquipment({ name: "新カメラ", workspaceId: "ws1" });

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("scopes recipients to the equipment's workspace members (does not leak to other workspaces)", async () => {
    // ws1 のメンバーは u1 / u2 のみ。他ワークスペースのユーザーが
    // userSettings の絞り込み条件（userId IN メンバー）に含まれないことを担保する。
    membershipFindManyMock.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    userSettingsFindManyMock.mockResolvedValue([]);

    await notifyNewEquipment({ name: "新カメラ", workspaceId: "ws1" });

    // メンバー一覧は対象ワークスペースだけを引く
    expect(membershipFindManyMock).toHaveBeenCalledWith({
      where: { workspaceId: "ws1" },
      select: { userId: true },
    });
    // 配信先候補はそのメンバーの userId に限定される
    expect(userSettingsFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          notifyNewEquipment: true,
          userId: { in: ["u1", "u2"] },
        }),
      }),
    );
  });

  it("sends nothing when the workspace has no members", async () => {
    membershipFindManyMock.mockResolvedValue([]);
    userSettingsFindManyMock.mockResolvedValue([]);

    await notifyNewEquipment({ name: "新カメラ", workspaceId: "ws-empty" });

    expect(userSettingsFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: [] } }),
      }),
    );
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("notifyInBackground", () => {
  it("swallows task rejection and never throws", async () => {
    getCtxMock.mockImplementation(() => {
      throw new Error("no cloudflare context");
    });
    const rejecting = Promise.reject(new Error("boom"));

    expect(() => notifyInBackground(rejecting)).not.toThrow();
    // マイクロタスクを流して未処理拒否が起きないことを確認
    await Promise.resolve();
  });

  it("uses ctx.waitUntil when the Cloudflare context is present", () => {
    notifyInBackground(Promise.resolve());
    expect(waitUntilMock).toHaveBeenCalledTimes(1);
  });
});
