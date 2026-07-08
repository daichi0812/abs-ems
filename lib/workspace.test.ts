import { describe, expect, it } from "vitest";

import { DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_SLUG } from "./workspace";

describe("workspace constants", () => {
  it("keeps the fixed id in sync with the migration (ws_abs_default)", () => {
    // migration 20260707171315 の INSERT / schema.prisma の @default と一致していること
    expect(DEFAULT_WORKSPACE_ID).toBe("ws_abs_default");
    expect(DEFAULT_WORKSPACE_SLUG).toBe("abs");
  });
});
