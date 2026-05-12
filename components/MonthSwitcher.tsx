"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth, currentMonthKey } from "@/lib/format";

type Props = {
  value: string;
  onChange: (key: string) => void;
};

export default function MonthSwitcher({ value, onChange }: Props) {
  const isCurrent = value === currentMonthKey();
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-2">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(value, -1))}
        className="rounded-full p-2 text-foreground hover:bg-surface-2 active:scale-95"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="text-base font-semibold">{monthLabel(value)}</div>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => onChange(shiftMonth(value, 1))}
        disabled={isCurrent}
        className="rounded-full p-2 text-foreground hover:bg-surface-2 active:scale-95 disabled:opacity-30"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
