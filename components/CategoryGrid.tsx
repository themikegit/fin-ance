"use client";

import { categoryColor, type Category } from "@/lib/categories";

type Props = {
  categories: Category[];
  onPick: (category: Category) => void;
  disabled?: boolean;
};

export default function CategoryGrid({ categories, onPick, disabled }: Props) {
  if (categories.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface-2 px-4 py-6 text-center text-sm text-muted">
        No categories yet. Add some in{" "}
        <span className="font-medium">Settings &rsaquo; Categories</span>.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(c)}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-4 text-foreground transition-all active:scale-95 disabled:opacity-50 hover:bg-surface-2"
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: categoryColor(c.id) }}
            aria-hidden
          />
          <span className="text-sm font-medium truncate w-full text-center">
            {c.name}
          </span>
        </button>
      ))}
    </div>
  );
}
