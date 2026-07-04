import type { Equipment, Reserve } from "@/types/domain";

/**
 * 特定の機材について、既存予約と新しい予約期間が重なるか判定する。
 * 「重なる」: 新規開始が既存範囲内 or 新規終了が既存範囲内 or 既存全体を新規が包含。
 */
export const isOverlapping = (
  reserves: Reserve[],
  listId: number,
  start: string,
  end: string,
): boolean => {
  const newStart = new Date(start).getTime();
  const newEnd = new Date(end).getTime();

  const equipmentReserves = reserves.filter((r) => r.list_id === listId);

  return equipmentReserves.some((reserve) => {
    const existingStart = new Date(reserve.start).getTime();
    const existingEnd = new Date(reserve.end).getTime();

    return (
      (newStart >= existingStart && newStart <= existingEnd) ||
      (newEnd >= existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    );
  });
};

/**
 * 選択された機材すべてについて期間重複をチェックし、衝突した機材の名前リストを返す。
 * 重複名は 1 つに束ねる。equipments に存在しない id は無視。
 */
export const checkAllOverlaps = (
  reserves: Reserve[],
  equipments: Equipment[],
  selectedIds: ReadonlySet<number> | readonly number[],
  start: string,
  end: string,
): { hasOverlap: boolean; conflictingEquipments: string[] } => {
  const conflictingNames = new Set<string>();

  const ids = Array.isArray(selectedIds) ? selectedIds : Array.from(selectedIds);
  for (const equipmentId of ids) {
    if (isOverlapping(reserves, equipmentId, start, end)) {
      const equipment = equipments.find((e) => e.id === equipmentId);
      if (equipment) {
        conflictingNames.add(equipment.name);
      }
    }
  }

  return {
    hasOverlap: conflictingNames.size > 0,
    conflictingEquipments: Array.from(conflictingNames),
  };
};
