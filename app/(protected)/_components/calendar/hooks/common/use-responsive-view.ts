"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT_PX = 768;

export const useResponsiveView = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [displayWeekly, setDisplayWeekly] = useState(false);
  const [displayMonthly, setDisplayMonthly] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT_PX);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showWeekly = () => {
    setDisplayMonthly(false);
    setDisplayWeekly(true);
  };

  const showMonthly = () => {
    setDisplayWeekly(false);
    setDisplayMonthly(true);
  };

  return { isMobile, displayWeekly, displayMonthly, showWeekly, showMonthly };
};
