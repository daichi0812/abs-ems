"use client";

import { useEffect, useState } from "react";

// md ブレークポイント（768px）以上かどうか。カレンダーの行高など
// CSS だけで切り替えられない JS 計算値の出し分けに使う。
// SSR/初回レンダーは false（モバイル寸法）で、マウント後に実測へ追従する。
export function useIsDesktop(query = "(min-width: 768px)") {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isDesktop;
}
