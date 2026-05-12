"use client";

import { CATEGORIES, type CategoryId } from "@/lib/categories";

type Props = {
  onPick: (id: CategoryId) => void;
  disabled?: boolean;
};

export default function CategoryGrid({ onPick, disabled }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(c.id)}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-surface px-3 py-4 text-foreground transition-all active:scale-95 disabled:opacity-50 hover:bg-surface-2"
        >
          <span className="text-3xl leading-none">{c.emoji}</span>
          <span className="text-xs font-medium">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
