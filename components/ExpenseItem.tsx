"use client";

import { Trash2 } from "lucide-react";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { formatRSD, formatDay } from "@/lib/format";
import type { Expense } from "@/lib/types";

type Props = {
  expense: Expense;
  onDelete: (id: string) => void;
  pendingDelete?: boolean;
};

export default function ExpenseItem({ expense, onDelete, pendingDelete }: Props) {
  const cat = CATEGORY_BY_ID[expense.category];
  const title = expense.name?.trim() || cat.label;
  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-xl"
        aria-hidden
      >
        {cat.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-muted">{formatDay(expense.created_at)}</div>
      </div>
      <div className="text-sm font-semibold text-neg">
        −{formatRSD(expense.amount)}
      </div>
      <button
        type="button"
        aria-label="Delete expense"
        onClick={() => onDelete(expense.id)}
        disabled={pendingDelete}
        className="ml-1 p-2 -mr-2 text-muted hover:text-neg disabled:opacity-40"
      >
        <Trash2 size={18} />
      </button>
    </li>
  );
}
