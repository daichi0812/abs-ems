"use client";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 ml-1 mt-5 text-[11.5px] font-extrabold tracking-wider text-ink-faint">
      {children}
    </p>
  );
}

export function ToggleRow({
  title,
  desc,
  checked,
  disabled,
  onChange,
  divider,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  divider?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 py-3.5", divider && "border-b border-line-soft")}>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold text-ink">{title}</p>
        <p className="m-0 mt-0.5 text-[11.5px] leading-snug text-ink-faint">{desc}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
