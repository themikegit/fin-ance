"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import ExpenseItem from "@/components/ExpenseItem";
import {
  fetchCategories,
  fetchExpenses,
  fetchIncomes,
  fetchMonthlyExpenses,
  fetchSpaces,
  fetchSpaceMembers,
  deleteExpense,
} from "@/lib/client";
import {
  monthKey,
  monthLabel,
  currentMonthKey,
  formatRSD,
} from "@/lib/format";
import type {
  Category,
  Expense,
  Income,
  MonthlyExpense,
  SpaceSummary,
  SpaceMemberView,
} from "@/lib/types";

type MonthGroup = {
  key: string;
  expenses: Expense[];
  total: number;
};

type Scope = { kind: "personal" } | { kind: "space"; id: string };

export default function ExpensesClient() {
  const { user } = useUser();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [incomes, setIncomes] = useState<Income[] | null>(null);
  const [fixed, setFixed] = useState<MonthlyExpense[]>([]);
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<SpaceMemberView[]>([]);
  const [scope, setScope] = useState<Scope>({ kind: "personal" });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingScope, setLoadingScope] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sps, cats] = await Promise.all([fetchSpaces(), fetchCategories()]);
        if (cancelled) return;
        setSpaces(sps);
        setCategories(cats);
        setOpen({ [currentMonthKey()]: true });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryById = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingScope(true);
      setError(null);
      try {
        if (scope.kind === "personal") {
          const [exps, incs, fx] = await Promise.all([
            fetchExpenses(),
            fetchIncomes(),
            fetchMonthlyExpenses(),
          ]);
          if (cancelled) return;
          setExpenses(exps);
          setIncomes(incs);
          setFixed(fx);
          setMembers([]);
        } else {
          const [exps, incs, fx, m] = await Promise.all([
            fetchExpenses(scope.id),
            fetchIncomes(scope.id),
            fetchMonthlyExpenses(scope.id),
            fetchSpaceMembers(scope.id),
          ]);
          if (cancelled) return;
          setExpenses(exps);
          setIncomes(incs);
          setFixed(fx);
          setMembers(m);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoadingScope(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const memberNameByUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of members) {
      if (mem.user_id) m.set(mem.user_id, mem.display_name);
    }
    return m;
  }, [members]);

  const monthlyIncomeTotal = useMemo(
    () => (incomes ?? []).reduce((s, i) => s + Number(i.amount), 0),
    [incomes],
  );
  const monthlyFixedTotal = useMemo(
    () => fixed.reduce((s, i) => s + Number(i.amount), 0),
    [fixed],
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

  const inSpace = scope.kind === "space";
  const currentUserId = user?.id;

  return (
    <div className="mx-auto max-w-md px-4 pt-2 pb-4 space-y-4">
      {spaces.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <ScopeTab
            label="Personal"
            active={scope.kind === "personal"}
            onClick={() => setScope({ kind: "personal" })}
          />
          {spaces.map((s) => (
            <ScopeTab
              key={s.id}
              label={s.name}
              active={scope.kind === "space" && scope.id === s.id}
              onClick={() => setScope({ kind: "space", id: s.id })}
            />
          ))}
        </div>
      ) : null}

      {loadingScope && groups.length === 0 ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : null}

      {groups.length === 0 && !loadingScope ? (
        <div className="pt-8 text-center text-sm text-muted">
          {inSpace ? (
            "No expenses in this space yet."
          ) : (
            <>
              No expenses yet. Tap <span className="font-medium">Add</span> to
              log one.
            </>
          )}
        </div>
      ) : null}

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
                  <div className="px-4 py-3 border-t border-border bg-surface-2/40 text-xs space-y-2">
                    <div className="grid grid-cols-3 gap-2">
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
                            monthlyIncomeTotal -
                              g.total -
                              monthlyFixedTotal >=
                            0
                              ? "text-pos"
                              : "text-neg"
                          }`}
                        >
                          {formatRSD(
                            monthlyIncomeTotal -
                              g.total -
                              monthlyFixedTotal,
                          )}
                        </div>
                      </div>
                    </div>
                    {monthlyFixedTotal > 0 ? (
                      <div className="text-muted">
                        incl. {formatRSD(monthlyFixedTotal)} fixed
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <ul className="border-t border-border">
                  {g.expenses.map((e) => {
                    const byline = inSpace
                      ? memberNameByUserId.get(e.user_id) ?? "Member"
                      : null;
                    const mine = !inSpace || e.user_id === currentUserId;
                    const cat = e.category_id
                      ? categoryById.get(e.category_id) ?? null
                      : null;
                    return (
                      <ExpenseItem
                        key={e.id}
                        expense={e}
                        category={cat}
                        onDelete={onDelete}
                        pendingDelete={pendingDelete === e.id}
                        byline={byline}
                        canDelete={mine}
                      />
                    );
                  })}
                </ul>
              </>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function ScopeTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
