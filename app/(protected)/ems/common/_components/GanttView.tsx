import { type RefObject } from "react";
import { cn } from "@/lib/utils";
import { type CalendarEvent } from "@/app/(protected)/ems/common/hooks/use-calendar-data";
import { EquipmentGantt, type GanttRow } from "@/components/calendar/EquipmentGantt";
import { EventDetailPopover, type EventDetail } from "@/components/calendar/EventDetailPopover";

interface GanttViewProps {
  isWindowLoading: boolean;
  ganttRows: GanttRow<CalendarEvent>[];
  ganttWindowStart: number;
  ganttDayCount: number;
  todayIdx: number;
  onSelectKey: (key: number) => void;
  detailRef: RefObject<HTMLDivElement | null>;
  detail: EventDetail | null;
  colorOf: (name: string | null | undefined) => string;
  imageOf: (name: string | null | undefined) => string | undefined;
}

export function GanttView({
  isWindowLoading,
  ganttRows,
  ganttWindowStart,
  ganttDayCount,
  todayIdx,
  onSelectKey,
  detailRef,
  detail,
  colorOf,
  imageOf,
}: GanttViewProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-3 shadow-sm transition-opacity",
        isWindowLoading && "opacity-60"
      )}
    >
      {ganttRows.length === 0 ? (
        <p className="py-10 text-center text-[12.5px] text-ink-faint">
          この期間に貸出中の機材はありません
        </p>
      ) : (
        <EquipmentGantt<CalendarEvent>
          windowStartIdx={ganttWindowStart}
          dayCount={ganttDayCount}
          todayIdx={todayIdx}
          rows={ganttRows}
          onBarClick={(bar) => bar.data && onSelectKey(Number(bar.key))}
        />
      )}
      {detail && (
        <div ref={detailRef} className="mt-3 scroll-mt-20">
          <EventDetailPopover
            detail={detail}
            color={colorOf(detail.who)}
            image={imageOf(detail.who)}
          />
        </div>
      )}
    </div>
  );
}
