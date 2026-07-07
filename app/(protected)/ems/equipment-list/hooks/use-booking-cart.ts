"use client";

import { useState } from "react";
import { toast } from "sonner";

import { toJstDayIndex } from "@/lib/calendar/date-grid";
import type { DayRange } from "@/components/calendar/RangeMiniCalendar";
import type { Reserve } from "@/types/domain";

interface UseBookingCartParams {
  reserves: Reserve[];
  equipmentName: (id: number) => string;
}

// 予約ウィザードのカート状態。機材の選択トグルと、期間変更に伴う自動整理を持つ。
export function useBookingCart({ reserves, equipmentName }: UseBookingCartParams) {
  const [cart, setCart] = useState<number[]>([]);

  const toggle = (id: number) =>
    setCart((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // 期間変更でカートを全消去すると「期間を変更してください」の案内に従った
  // ユーザーが機材を全部選び直すことになるため、新しい期間で空きがない機材
  // だけを外す（期間選択の途中 = endIdx 未確定の間は何もしない）。
  const pruneForRange = (r: DayRange) => {
    if (r.startIdx == null || r.endIdx == null) return;
    const dropped = cart.filter((id) =>
      reserves.some(
        (rv) =>
          rv.list_id === id &&
          r.startIdx! <= toJstDayIndex(rv.end) &&
          r.endIdx! >= toJstDayIndex(rv.start)
      )
    );
    if (dropped.length > 0) {
      setCart((prev) => prev.filter((id) => !dropped.includes(id)));
      toast(
        `${dropped.map(equipmentName).join("、")} は新しい期間では空きがないため選択から外しました。`
      );
    }
  };

  return { cart, setCart, toggle, pruneForRange };
}
