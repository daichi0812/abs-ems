import { type RefObject } from "react";
import { cn } from "@/lib/utils";
import { type CalendarEvent } from "@/app/(protected)/ems/common/hooks/use-calendar-data";
import { type WeekRow } from "@/lib/calendar/build-month-weeks";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { MemberChips } from "@/components/calendar/MemberChips";
import { EventDetailPopover, type EventDetail } from "@/components/calendar/EventDetailPopover";

interface MonthViewProps {
  isWindowLoading: boolean;
  members: string[];
  memberFilter: string | null;
  onMemberChange: (value: string | null) => void;
  colorOf: (name: string | null | undefined) => string;
  imageOf: (name: string | null | undefined) => string | undefined;
  weeks: WeekRow<CalendarEvent>[];
  isDesktop: boolean;
  selectedKey: number | null;
  onSelectKey: (key: number) => void;
  detailRef: RefObject<HTMLDivElement | null>;
  detail: EventDetail | null;
}

export function MonthView({
  isWindowLoading,
  members,
  memberFilter,
  onMemberChange,
  colorOf,
  imageOf,
  weeks,
  isDesktop,
  selectedKey,
  onSelectKey,
  detailRef,
  detail,
}: MonthViewProps) {
  return (
    // grid-cols-1（minmax(0,1fr)）を明示しないと、モバイルでトラックが
    // コンテンツ幅に広がり画面からはみ出す
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
      <div
        className={cn(
          "rounded-2xl bg-white p-4 shadow-sm transition-opacity",
          // 窓の取得中は前の窓を出したまま淡くする（前後月はプリフェッチ済みのため稀）
          isWindowLoading && "opacity-60"
        )}
      >
        <MemberChips
          members={members}
          value={memberFilter}
          onChange={onMemberChange}
          colorOf={colorOf}
          imageOf={imageOf}
          className="mb-3"
        />
        <MonthGrid<CalendarEvent>
          weeks={weeks}
          barHeight={isDesktop ? 22 : 18}
          selectedKey={selectedKey ?? undefined}
          onBarClick={(bar) => onSelectKey(Number(bar.key))}
          isDimmed={(bar) =>
            memberFilter != null && bar.data?.name !== memberFilter
          }
        />
      </div>
      <div ref={detailRef} className="md:sticky md:top-24 md:self-start scroll-mt-20">
        {detail ? (
          <EventDetailPopover
            detail={detail}
            color={colorOf(detail.who)}
            image={imageOf(detail.who)}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-[12.5px] text-ink-faint">
            バーをタップすると
            <br />
            「誰が・何を・いつまで」を表示
          </div>
        )}
      </div>
    </div>
  );
}
