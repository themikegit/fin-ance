"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
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
  updateExpense,
} from "@/lib/client";
import { categoryColor, categoryInitial } from "@/lib/categories";
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
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingScope, setLoadingScope] = useState<boolean>(false);

  const onSaveEdit = async (
    id: string,
    patch: {
      amount?: number;
      category_id?: string | null;
      name?: string | null;
      created_at?: string;
    },
  ) => {
    const updated = await updateExpense(id, patch);
    setExpenses((es) =>
      es ? es.map((e) => (e.id === id ? updated : e)) : es,
    );
    setEditing(null);
  };

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

  const fixedByMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fixed) {
      const k = monthKey(f.created_at);
      m.set(k, (m.get(k) ?? 0) + Number(f.amount));
    }
    return m;
  }, [fixed]);

  type MonthGroupExt = MonthGroup & { fixedTotal: number };
  const groups: MonthGroupExt[] = useMemo(() => {
    if (!expenses) return [];
    const map = new Map<string, MonthGroupExt>();
    for (const e of expenses) {
      const k = monthKey(e.created_at);
      let g = map.get(k);
      if (!g) {
        g = { key: k, expenses: [], total: 0, fixedTotal: 0 };
        map.set(k, g);
      }
      g.expenses.push(e);
      g.total += Number(e.amount);
    }
    for (const [k, fixedSum] of fixedByMonth.entries()) {
      let g = map.get(k);
      if (!g) {
        g = { key: k, expenses: [], total: 0, fixedTotal: fixedSum };
        map.set(k, g);
      } else {
        g.fixedTotal = fixedSum;
      }
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [expenses, fixedByMonth]);

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
        const groupSpent = g.total + g.fixedTotal;
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
                  {g.fixedTotal > 0 ? " + fixed" : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-neg">
                  −{formatRSD(groupSpent)}
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
                          {formatRSD(groupSpent)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted">Left</div>
                        <div
                          className={`font-semibold ${
                            monthlyIncomeTotal - groupSpent >= 0
                              ? "text-pos"
                              : "text-neg"
                          }`}
                        >
                          {formatRSD(monthlyIncomeTotal - groupSpent)}
                        </div>
                      </div>
                    </div>
                    {g.fixedTotal > 0 ? (
                      <div className="text-muted">
                        incl. {formatRSD(g.fixedTotal)} fixed
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
                        onEdit={mine ? setEditing : undefined}
                        pendingDelete={pendingDelete === e.id}
                        byline={byline}
                        canEdit={mine}
                      />
                    );
                  })}
                </ul>
              </>
            ) : null}
          </section>
        );
      })}

      {editing ? (
        <EditExpenseSheet
          expense={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={onSaveEdit}
        />
      ) : null}
    </div>
  );
}

function EditExpenseSheet({
  expense,
  categories,
  onClose,
  onSave,
}: {
  expense: Expense;
  categories: Category[];
  onClose: () => void;
  onSave: (
    id: string,
    patch: {
      amount?: number;
      category_id?: string | null;
      name?: string | null;
      created_at?: string;
    },
  ) => Promise<void>;
}) {
  const [amount, setAmount] = useState<string>(String(expense.amount));
  const [name, setName] = useState<string>(expense.name ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    expense.category_id,
  );
  const [date, setDate] = useState<string>(
    expense.created_at.slice(0, 10),
  );
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const numeric = Number.parseFloat(amount);
  const valid = Number.isFinite(numeric) && numeric > 0 && !!date;

  const submit = async () => {
    if (!valid || busy) return;
    const patch: {
      amount?: number;
      category_id?: string | null;
      name?: string | null;
      created_at?: string;
    } = {};
    if (numeric !== Number(expense.amount)) patch.amount = numeric;
    if ((name.trim() || null) !== (expense.name ?? null)) {
      patch.name = name.trim() || null;
    }
    if (categoryId !== expense.category_id) patch.category_id = categoryId;
    if (date !== expense.created_at.slice(0, 10)) {
      const d = new Date(`${date}T12:00:00.000Z`);
      patch.created_at = d.toISOString();
    }
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(expense.id, patch);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-8 shadow-2xl animate-slide-up safe-pb">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold">Edit expense</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-surface-2"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-muted">
            Amount (RSD)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value.replace(/[^\d.]/g, ""))
            }
            disabled={busy}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-lg tabular-nums outline-none focus:border-brand"
          />

          <label className="block text-xs font-medium uppercase tracking-wide text-muted">
            Description
          </label>
          <input
            type="text"
            value={name}
            placeholder="What was it?"
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-brand"
          />

          <label className="block text-xs font-medium uppercase tracking-wide text-muted">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-brand"
          />

          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            Category
          </div>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((c) => {
              const active = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  disabled={busy}
                  className={`flex items-center gap-2 rounded-xl border px-2 py-2 text-xs ${
                    active
                      ? "border-brand bg-surface-2"
                      : "border-border bg-surface"
                  }`}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white shrink-0"
                    style={{ background: categoryColor(c.id) }}
                    aria-hidden
                  >
                    {categoryInitial(c.name)}
                  </span>
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-center text-sm text-neg">{error}</p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-2xl border border-border bg-surface-2 py-3 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || busy}
            className="flex-1 rounded-2xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </>
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
