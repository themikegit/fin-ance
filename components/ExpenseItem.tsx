"use client";

import { Trash2 } from "lucide-react";
import { categoryColor, categoryInitial } from "@/lib/categories";
import { formatRSD, formatDay } from "@/lib/format";
import type { Category, Expense } from "@/lib/types";

type Props = {
  expense: Expense;
  category: Category | null;
  onDelete: (id: string) => void;
  pendingDelete?: boolean;
  byline?: string | null;
  canDelete?: boolean;
};

export default function ExpenseItem({
  expense,
  category,
  onDelete,
  pendingDelete,
  byline,
  canDelete = true,
}: Props) {
  const categoryName = category?.name || "Uncategorized";
  const title = expense.name?.trim() || categoryName;
  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ background: categoryColor(category?.id) }}
        aria-hidden
      >
        {categoryInitial(categoryName)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-muted truncate">
          {formatDay(expense.created_at)}
          {byline ? ` · ${byline}` : ""}
        </div>
      </div>
      <div className="text-sm font-semibold text-neg">
        −{formatRSD(expense.amount)}
      </div>
      {canDelete ? (
        <button
          type="button"
          aria-label="Delete expense"
          onClick={() => onDelete(expense.id)}
          disabled={pendingDelete}
          className="ml-1 p-2 -mr-2 text-muted hover:text-neg disabled:opacity-40"
        >
          <Trash2 size={18} />
        </button>
      ) : null}
    </li>
  );
}
