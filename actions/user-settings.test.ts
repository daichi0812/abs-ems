import { beforeEach, describe, expect, it, vi } from "vitest";

const { currentUserMock, findUniqueMock, upsertMock } = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ currentUser: () => currentUserMock() }));
vi.mock("@/lib/db", () => ({
  db: { userSettings: { findUnique: findUniqueMock, upsert: upsertMock } },
}));

import { getUserSettings, updateUserSettings } from "./user-settings";
import { DEFAULT_USER_SETTINGS } from "@/lib/user-settings";

const validValues = {
  notifyReturnReminder: false,
  notifyReservationEvents: true,
  notifyNewEquipment: true,
  lineNotifyEnabled: true,
  calendarDefaultView: "GANTT" as const,
};

beforeEach(() => {
  currentUserMock.mockReset();
  findUniqueMock.mockReset();
  upsertMock.mockReset();
});

describe("getUserSettings", () => {
  it("returns defaults when unauthenticated", async () => {
    currentUserMock.mockResolvedValue(undefined);
    const res = await getUserSettings();
    expect(res).toEqual(DEFAULT_USER_SETTINGS);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns defaults when no row exists", async () => {
    currentUserMock.mockResolvedValue({ id: "u1" });
    findUniqueMock.mockResolvedValue(null);
    const res = await getUserSettings();
    expect(res).toEqual(DEFAULT_USER_SETTINGS);
  });

  it("maps the stored row fields", async () => {
    currentUserMock.mockResolvedValue({ id: "u1" });
    findUniqueMock.mockResolvedValue({ ...validValues, id: "s1", userId: "u1", lineUserId: null });
    const res = await getUserSettings();
    expect(res).toEqual(validValues);
  });
});

describe("updateUserSettings", () => {
  it("rejects unauthenticated callers", async () => {
    currentUserMock.mockResolvedValue(undefined);
    const res = await updateUserSettings(validValues);
    expect(res).toEqual({ error: "認証されていません" });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("rejects invalid input", async () => {
    currentUserMock.mockResolvedValue({ id: "u1" });
    const res = await updateUserSettings({ ...validValues, calendarDefaultView: "WEEK" } as never);
    expect(res).toEqual({ error: "入力が正しくありません" });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("upserts with the current user id and returns success", async () => {
    currentUserMock.mockResolvedValue({ id: "u1" });
    upsertMock.mockResolvedValue({});
    const res = await updateUserSettings(validValues);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { userId: "u1" },
      create: { userId: "u1", ...validValues },
      update: validValues,
    });
    expect(res).toEqual({ success: "設定を保存しました" });
  });
});
