import { describe, expect, it } from "vitest";
import { WorkspaceRole } from "@prisma/client";

import {
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_SLUG,
  canAssignRole,
  canManageMember,
} from "./workspace";

const { OWNER, ADMIN, MEMBER } = WorkspaceRole;

describe("workspace constants", () => {
  it("keeps the fixed id in sync with the migration (ws_abs_default)", () => {
    // migration 20260707171315 の INSERT / schema.prisma の @default と一致していること
    expect(DEFAULT_WORKSPACE_ID).toBe("ws_abs_default");
    expect(DEFAULT_WORKSPACE_SLUG).toBe("abs");
  });
});

describe("canManageMember（OWNER 優位）", () => {
  it.each([
    // [actor, target, expected]
    [OWNER, OWNER, true],
    [OWNER, ADMIN, true],
    [OWNER, MEMBER, true],
    [ADMIN, OWNER, false], // ADMIN は OWNER に触れない
    [ADMIN, ADMIN, true],
    [ADMIN, MEMBER, true],
    [MEMBER, OWNER, false],
    [MEMBER, ADMIN, false],
    [MEMBER, MEMBER, false],
  ] as const)("actor=%s target=%s → %s", (actor, target, expected) => {
    expect(canManageMember(actor, target)).toBe(expected);
  });
});

describe("canAssignRole（OWNER の任命は OWNER のみ）", () => {
  it.each([
    [OWNER, OWNER, true],
    [OWNER, ADMIN, true],
    [OWNER, MEMBER, true],
    [ADMIN, OWNER, false], // ADMIN は OWNER を任命できない
    [ADMIN, ADMIN, true],
    [ADMIN, MEMBER, true],
    [MEMBER, MEMBER, false],
  ] as const)("actor=%s newRole=%s → %s", (actor, newRole, expected) => {
    expect(canAssignRole(actor, newRole)).toBe(expected);
  });
});
