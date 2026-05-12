"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import ExpenseItem from "@/components/ExpenseItem";
import {
  fetchExpenses,
  fetchIncomes,
  deleteExpense,
} from "@/lib/client";
import {
  monthKey,
  monthLabel,
  currentMonthKey,
  formatRSD,
} from "@/lib/format";
import type { Expense, Income } from "@/lib/types";

type MonthGroup = {
  key: string;
  expenses: Expense[];
  total: number;
};

export default function ExpensesClient() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [incomes, setIncomes] = useState<Income[] | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [exps, incs] = await Promise.all([
          fetchExpenses(),
          fetchIncomes(),
        ]);
        if (cancelled) return;
        setExpenses(exps);
        setIncomes(incs);
        setOpen({ [currentMonthKey()]: true });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyIncomeTotal = useMemo(
    () => (incomes ?? []).reduce((s, i) => s + Number(i.amount), 0),
    [incomes],
  );

  const groups: MonthGroup[] = useMemo(() => {
    if (!expenses) return [];
    const map = new Map<string, MonthGroup>();
    for (const e of expenses) {
      const k = monthKey(e.created_at);
      let g = map.get(k);
      if (!g) {
        g = { key: k, expenses: [], total: 0 };
        map.set(k, g);
      }
      g.expenses.push(e);
      g.total += Number(e.amount);
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [expenses]);

  const onDelete = async (id: string) => {
    if (pendingDelete) return;
    setPendingDelete(id);
    const prev = expenses;
    setExpenses((es) => (es ? es.filter((e) => e.id !== id) : es));
    try {
      await deleteExpense(id);
    } catch (e) {
      setError((e as Error).message);
      setExpenses(prev);
    } finally {
      setPendingDelete(null);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6 text-sm text-neg">{error}</div>
    );
  }

  if (!expenses || !incomes) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6 text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12 text-center text-sm text-muted">
        No expenses yet. Tap <span className="font-medium">Add</span> to log
        one.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-2 pb-4 space-y-4">
      {groups.map((g) => {
        const isOpen = !!open[g.key];
        const showIncome =
          monthlyIncomeTotal > 0 && g.key === currentMonthKey();
        return (
          <section
            key={g.key}
            className="rounded-2xl border border-border bg-surface overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-2"
              aria-expanded={isOpen}
            >
              <div>
                <div className="text-sm font-semibold">
                  {monthLabel(g.key)}
                </div>
                <div className="text-xs text-muted">
                  {g.expenses.length} item{g.expenses.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-neg">
                  −{formatRSD(g.total)}
                </div>
                <ChevronDown
                  size={18}
                  className={`text-muted transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {isOpen ? (
              <>
                {showIncome ? (
                  <div className="px-4 py-3 border-t border-border bg-surface-2/40 text-xs grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-muted">Income</div>
                      <div className="font-semibold text-pos">
                        {formatRSD(monthlyIncomeTotal)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Spent</div>
                      <div className="font-semibold text-neg">
                        {formatRSD(g.total)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Left</div>
                      <div
                        className={`font-semibold ${
                          monthlyIncomeTotal - g.total >= 0
                            ? "text-pos"
                            : "text-neg"
                        }`}
                      >
                        {formatRSD(monthlyIncomeTotal - g.total)}
                      </div>
                    </div>
                  </div>
                ) : null}
                <ul className="border-t border-border">
                  {g.expenses.map((e) => (
                    <ExpenseItem
                      key={e.id}
                      expense={e}
                      onDelete={onDelete}
                      pendingDelete={pendingDelete === e.id}
                    />
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
