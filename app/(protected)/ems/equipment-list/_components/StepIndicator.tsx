import { cn } from "@/lib/utils";

export function StepDot({ n, active }: { n: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11.5px] font-bold",
        active ? "bg-brand text-white" : "bg-white text-ink-faint"
      )}
      style={!active ? { border: "2px solid #D0D5DD" } : undefined}
    >
      {n}
    </span>
  );
}

export function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "期間" },
    { n: 2, label: "機材" },
    { n: 3, label: "確認" },
  ];
  return (
    <div className="mb-4 flex items-center px-2">
      {steps.map((st, i) => {
        const active = step === st.n;
        const done = step > st.n;
        return (
          <div key={st.n} className="flex items-center" style={{ flex: i < 2 ? 1 : "none" }}>
            <div className="flex flex-none flex-col items-center gap-1">
              <span
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-bold transition-colors"
                style={{
                  background: active || done ? "#2E90FA" : "#fff",
                  border: `2px solid ${active || done ? "#2E90FA" : "#D0D5DD"}`,
                  color: active || done ? "#fff" : "#98A2B3",
                }}
              >
                {done ? "✓" : st.n}
              </span>
              <span
                className="text-[10px] font-bold"
                style={{ color: active ? "#101828" : "#98A2B3" }}
              >
                {st.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className="mx-1.5 mb-4 h-0.5 flex-1"
                style={{ background: step > st.n ? "#2E90FA" : "#E4E7EC" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
