"use client";

// 予約完了画面。
export function DoneScreen({
  doneText,
  onToCalendar,
  onRestart,
}: {
  doneText: string;
  onToCalendar: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="px-2 pt-8 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#ECFDF3]">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 12.5l5 5 10-11" />
        </svg>
      </div>
      <h2 className="m-0 mb-1.5 text-xl font-black">予約が完了しました</h2>
      <p className="m-0 mb-6 text-[13px] text-ink-muted">{doneText}</p>
      <button
        type="button"
        onClick={onToCalendar}
        className="mb-2.5 h-12 w-full rounded-xl bg-navy text-[14.5px] font-bold text-white"
      >
        カレンダーで確認する
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="h-12 w-full rounded-xl border-[1.5px] border-line-strong bg-white text-[14.5px] font-bold text-ink"
      >
        続けて予約する
      </button>
    </div>
  );
}
