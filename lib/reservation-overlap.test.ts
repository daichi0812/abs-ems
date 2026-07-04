import { describe, expect, it } from "vitest";
import type { Equipment, Reserve } from "@/types/domain";
import { checkAllOverlaps, isOverlapping } from "./reservation-overlap";

const makeReserve = (partial: Partial<Reserve>): Reserve => ({
  id: 1,
  user_id: "u1",
  start: "2026-01-01",
  end: "2026-01-02",
  list_id: 1,
  ...partial,
});

const makeEquipment = (partial: Partial<Equipment>): Equipment => ({
  id: 1,
  name: "Camera",
  detail: "",
  image: "",
  tag_id: "1",
  ...partial,
});

describe("isOverlapping", () => {
  it("returns false when there are no reserves for the list", () => {
    expect(isOverlapping([], 1, "2026-01-10", "2026-01-12")).toBe(false);
  });

  it("returns false when reserves exist only for other list_ids", () => {
    const reserves = [makeReserve({ list_id: 2, start: "2026-01-10", end: "2026-01-15" })];
    expect(isOverlapping(reserves, 1, "2026-01-10", "2026-01-12")).toBe(false);
  });

  it("returns false when ranges do not overlap (new is before existing)", () => {
    const reserves = [makeReserve({ list_id: 1, start: "2026-01-10", end: "2026-01-15" })];
    expect(isOverlapping(reserves, 1, "2026-01-01", "2026-01-05")).toBe(false);
  });

  it("returns false when ranges do not overlap (new is after existing)", () => {
    const reserves = [makeReserve({ list_id: 1, start: "2026-01-10", end: "2026-01-15" })];
    expect(isOverlapping(reserves, 1, "2026-01-20", "2026-01-25")).toBe(false);
  });

  it("returns true when newStart falls inside an existing range", () => {
    const reserves = [makeReserve({ list_id: 1, start: "2026-01-10", end: "2026-01-15" })];
    expect(isOverlapping(reserves, 1, "2026-01-12", "2026-01-20")).toBe(true);
  });

  it("returns true when newEnd falls inside an existing range", () => {
    const reserves = [makeReserve({ list_id: 1, start: "2026-01-10", end: "2026-01-15" })];
    expect(isOverlapping(reserves, 1, "2026-01-05", "2026-01-12")).toBe(true);
  });

  it("returns true when new range completely contains an existing one", () => {
    const reserves = [makeReserve({ list_id: 1, start: "2026-01-10", end: "2026-01-15" })];
    expect(isOverlapping(reserves, 1, "2026-01-05", "2026-01-20")).toBe(true);
  });

  it("returns true when new range is contained within existing", () => {
    const reserves = [makeReserve({ list_id: 1, start: "2026-01-10", end: "2026-01-20" })];
    expect(isOverlapping(reserves, 1, "2026-01-12", "2026-01-15")).toBe(true);
  });

  it("returns true on exact boundary touch (start == end)", () => {
    const reserves = [makeReserve({ list_id: 1, start: "2026-01-10", end: "2026-01-15" })];
    expect(isOverlapping(reserves, 1, "2026-01-15", "2026-01-20")).toBe(true);
  });
});

describe("checkAllOverlaps", () => {
  const equipments = [
    makeEquipment({ id: 1, name: "Camera" }),
    makeEquipment({ id: 2, name: "Tripod" }),
    makeEquipment({ id: 3, name: "Microphone" }),
  ];

  it("returns hasOverlap=false when nothing conflicts", () => {
    const result = checkAllOverlaps([], equipments, [1, 2], "2026-01-10", "2026-01-12");
    expect(result).toEqual({ hasOverlap: false, conflictingEquipments: [] });
  });

  it("returns the name of the single conflicting equipment", () => {
    const reserves = [makeReserve({ list_id: 2, start: "2026-01-10", end: "2026-01-15" })];
    const result = checkAllOverlaps(reserves, equipments, [1, 2], "2026-01-12", "2026-01-20");
    expect(result).toEqual({ hasOverlap: true, conflictingEquipments: ["Tripod"] });
  });

  it("returns multiple conflicting names when several overlap", () => {
    const reserves = [
      makeReserve({ list_id: 1, start: "2026-01-10", end: "2026-01-15" }),
      makeReserve({ list_id: 3, start: "2026-01-10", end: "2026-01-15" }),
    ];
    const result = checkAllOverlaps(reserves, equipments, [1, 2, 3], "2026-01-12", "2026-01-13");
    expect(result.hasOverlap).toBe(true);
    expect(result.conflictingEquipments.sort()).toEqual(["Camera", "Microphone"]);
  });

  it("dedupes names when the same equipment has multiple overlapping reserves", () => {
    const reserves = [
      makeReserve({ id: 10, list_id: 1, start: "2026-01-10", end: "2026-01-12" }),
      makeReserve({ id: 11, list_id: 1, start: "2026-01-14", end: "2026-01-16" }),
    ];
    const result = checkAllOverlaps(reserves, equipments, [1], "2026-01-11", "2026-01-15");
    expect(result.conflictingEquipments).toEqual(["Camera"]);
  });

  it("ignores selected ids that are not in the equipments array", () => {
    const reserves = [makeReserve({ list_id: 999, start: "2026-01-10", end: "2026-01-15" })];
    const result = checkAllOverlaps(reserves, equipments, [999], "2026-01-12", "2026-01-13");
    expect(result).toEqual({ hasOverlap: false, conflictingEquipments: [] });
  });

  it("accepts Set<number> as selectedIds", () => {
    const reserves = [makeReserve({ list_id: 2, start: "2026-01-10", end: "2026-01-15" })];
    const result = checkAllOverlaps(reserves, equipments, new Set([1, 2]), "2026-01-12", "2026-01-13");
    expect(result.conflictingEquipments).toEqual(["Tripod"]);
  });
});
