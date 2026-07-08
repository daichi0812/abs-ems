import { useCallback, useRef, useState } from "react";

export interface MonthNav {
  /** 表示中の年（西暦）。 */
  viewYear: number;
  /** 表示中の月（0始まり。0=1月）。 */
  viewMonth0: number;
  /** 表示中の月が今日を含む月かどうか。 */
  isCurrentMonth: boolean;
  goPrevMonth: () => void;
  goNextMonth: () => void;
  goToday: () => void;
}

/**
 * 月送りナビゲーションの共通フック。
 * 年 / 0始まり月の state と、前月・翌月・今月へのジャンプ（年境界の繰り上げ/繰り下げ込み）を提供する。
 * MyReservations / BookingWizard / CalendarBoard で重複していた月送りロジックを1本化したもの。
 *
 * onChange は月が変わる操作のたびに呼ばれる。CalendarBoard の「月を移動したら選択を解除する」
 * のような付随副作用を呼び出し側で吸収するために使う。
 */
export function useMonthNav(onChange?: () => void): MonthNav {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth0, setViewMonth0] = useState(today.getMonth());

  // onChange がレンダーごとに再生成されても goPrev/goNext の同一性を保てるよう ref 経由で参照する。
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const goPrevMonth = useCallback(() => {
    onChangeRef.current?.();
    setViewMonth0((m) => (m === 0 ? 11 : m - 1));
    setViewYear((y) => (viewMonth0 === 0 ? y - 1 : y));
  }, [viewMonth0]);

  const goNextMonth = useCallback(() => {
    onChangeRef.current?.();
    setViewMonth0((m) => (m === 11 ? 0 : m + 1));
    setViewYear((y) => (viewMonth0 === 11 ? y + 1 : y));
  }, [viewMonth0]);

  const goToday = useCallback(() => {
    onChangeRef.current?.();
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth0(d.getMonth());
  }, []);

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth0 === today.getMonth();

  return {
    viewYear,
    viewMonth0,
    isCurrentMonth,
    goPrevMonth,
    goNextMonth,
    goToday,
  };
}
