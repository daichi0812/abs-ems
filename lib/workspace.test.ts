import { beforeEach, describe, expect, it, vi } from "vitest";

const { membershipUpsertMock, userUpdateMock } = vi.hoisted(() => ({
  membershipUpsertMock: vi.fn(),
  userUpdateMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    membership: { upsert: membershipUpsertMock },
    user: { update: userUpdateMock },
  },
}));

import { DEFAULT_WORKSPACE_ID, joinDefaultWorkspace } from "./workspace";

beforeEach(() => {
  membershipUpsertMock.mockReset();
  userUpdateMock.mockReset();
});

describe("joinDefaultWorkspace", () => {
  it("upserts a default-workspace membership and sets lastWorkspaceId", async () => {
    await joinDefaultWorkspace("u1");

    // upsert なので既所属でも二重呼び出しでも壊れない
    expect(membershipUpsertMock).toHaveBeenCalledWith({
      where: {
        userId_workspaceId: { userId: "u1", workspaceId: DEFAULT_WORKSPACE_ID },
      },
      update: {},
      create: { userId: "u1", workspaceId: DEFAULT_WORKSPACE_ID },
    });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { lastWorkspaceId: DEFAULT_WORKSPACE_ID },
    });
  });

  it("keeps the fixed id in sync with the migration (ws_abs_default)", () => {
    // migration 20260707171315 の INSERT / DB デフォルトと一致していること
    expect(DEFAULT_WORKSPACE_ID).toBe("ws_abs_default");
  });
});
