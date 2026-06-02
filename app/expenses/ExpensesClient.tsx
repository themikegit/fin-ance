"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import ExpenseItem from "@/components/ExpenseItem";
import MonthSwitcher from "@/components/MonthSwitcher";
import {
  fetchCategories,
  fetchExpenses,
  fetchIncomes,
  fetchSpaces,
  fetchSpaceMembers,
  deleteExpense,
  updateExpense,
  deleteIncome,
  updateIncome,
} from "@/lib/client";
import { categoryColor, categoryInitial } from "@/lib/categories";
import {
  monthKey,
  currentMonthKey,
  formatRSD,
  formatDay,
} from "@/lib/format";
import type {
  Category,
  Expense,
  Income,
  IncomeKind,
  SpaceSummary,
  SpaceMemberView,
} from "@/lib/types";

type Scope = { kind: "personal" } | { kind: "space"; id: string };

const KIND_LABEL: Record<IncomeKind, string> = {
  salary: "Salary",
  other: "Other",
};

export default function ExpensesClient() {
  const { user } = useUser();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [incomes, setIncomes] = useState<Income[] | null>(null);
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<SpaceMemberView[]>([]);
  const [scope, setScope] = useState<Scope>({ kind: "personal" });
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingIncomeDelete, setPendingIncomeDelete] = useState<string | null>(
    null,
  );
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
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

  const onSaveIncomeEdit = async (
    id: string,
    patch: { amount?: number; kind?: IncomeKind; created_at?: string },
  ) => {
    const updated = await updateIncome(id, patch);
    setIncomes((arr) =>
      arr ? arr.map((i) => (i.id === id ? updated : i)) : arr,
    );
    setEditingIncome(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sps, cats] = await Promise.all([fetchSpaces(), fetchCategories()]);
        if (cancelled) return;
        setSpaces(sps);
        setCategories(cats);
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
          const [exps, incs] = await Promise.all([
            fetchExpenses(),
            fetchIncomes(),
          ]);
          if (cancelled) return;
          setExpenses(exps);
          setIncomes(incs);
          setMembers([]);
        } else {
          const [exps, incs, m] = await Promise.all([
            fetchExpenses(scope.id),
            fetchIncomes(scope.id),
            fetchSpaceMembers(scope.id),
          ]);
          if (cancelled) return;
          setExpenses(exps);
          setIncomes(incs);
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

  const monthExpenses = useMemo(
    () =>
      (expenses ?? []).filter((e) => monthKey(e.created_at) === month),
    [expenses, month],
  );
  const monthIncomes = useMemo(
    () => (incomes ?? []).filter((i) => monthKey(i.created_at) === month),
    [incomes, month],
  );

  const spent = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const incomeTotal = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);
  const left = incomeTotal - spent;

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

  const onDeleteIncome = async (id: string) => {
    if (pendingIncomeDelete) return;
    setPendingIncomeDelete(id);
    const prev = incomes;
    setIncomes((arr) => (arr ? arr.filter((i) => i.id !== id) : arr));
    try {
      await deleteIncome(id);
    } catch (e) {
      setError((e as Error).message);
      setIncomes(prev);
    } finally {
      setPendingIncomeDelete(null);
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

      <MonthSwitcher value={month} onChange={setMonth} />

      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted">
              Income
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-pos">
              {formatRSD(incomeTotal)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted">
              Spent
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-neg">
              {formatRSD(spent)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted">
              Left
            </div>
            <div
              className={`mt-1 text-sm font-semibold tabular-nums ${
                left >= 0 ? "text-pos" : "text-neg"
              }`}
            >
              {formatRSD(left)}
            </div>
          </div>
        </div>
      </section>

      {loadingScope && monthExpenses.length === 0 && monthIncomes.length === 0 ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">
          Expenses
        </div>
        {monthExpenses.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            {inSpace
              ? "No expenses in this space this month."
              : "No expenses this month."}
          </p>
        ) : (
          <ul>
            {monthExpenses.map((e) => {
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
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">
          Income
        </div>
        {monthIncomes.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            No income this month.
          </p>
        ) : (
          <ul>
            {monthIncomes.map((i) => {
              const mine = !inSpace || i.user_id === currentUserId;
              const byline = inSpace
                ? memberNameByUserId.get(i.user_id) ?? "Member"
                : null;
              return (
                <IncomeRow
                  key={i.id}
                  income={i}
                  byline={byline}
                  canEdit={mine}
                  pendingDelete={pendingIncomeDelete === i.id}
                  onEdit={mine ? setEditingIncome : undefined}
                  onDelete={onDeleteIncome}
                />
              );
            })}
          </ul>
        )}
      </section>

      {editing ? (
        <EditExpenseSheet
          expense={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={onSaveEdit}
        />
      ) : null}

      {editingIncome ? (
        <EditIncomeSheet
          income={editingIncome}
          onClose={() => setEditingIncome(null)}
          onSave={onSaveIncomeEdit}
        />
      ) : null}
    </div>
  );
}

function IncomeRow({
  income,
  byline,
  canEdit,
  pendingDelete,
  onEdit,
  onDelete,
}: {
  income: Income;
  byline: string | null;
  canEdit: boolean;
  pendingDelete: boolean;
  onEdit?: (income: Income) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pos/15 text-xs font-semibold text-pos shrink-0">
        {KIND_LABEL[income.kind].slice(0, 1)}
      </span>
      <button
        type="button"
        onClick={canEdit ? () => onEdit?.(income) : undefined}
        disabled={!canEdit}
        className="flex-1 min-w-0 text-left disabled:cursor-default"
      >
        <div className="text-sm font-medium truncate">
          {KIND_LABEL[income.kind]}
        </div>
        <div className="text-[11px] text-muted truncate">
          {byline ? `${byline} · ` : ""}
          {formatDay(income.created_at)}
        </div>
      </button>
      <div className="text-sm font-semibold text-pos tabular-nums shrink-0">
        {formatRSD(Number(income.amount))}
      </div>
      {canEdit ? (
        <button
          type="button"
          aria-label="Delete income"
          onClick={() => onDelete(income.id)}
          disabled={pendingDelete}
          className="ml-1 p-2 -mr-2 text-muted hover:text-neg disabled:opacity-40"
        >
          <Trash2 size={18} />
        </button>
      ) : null}
    </li>
  );
}

function EditIncomeSheet({
  income,
  onClose,
  onSave,
}: {
  income: Income;
  onClose: () => void;
  onSave: (
    id: string,
    patch: { amount?: number; kind?: IncomeKind; created_at?: string },
  ) => Promise<void>;
}) {
  const [amount, setAmount] = useState<string>(String(income.amount));
  const [kind, setKind] = useState<IncomeKind>(income.kind);
  const [date, setDate] = useState<string>(income.created_at.slice(0, 10));
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const numeric = Number.parseFloat(amount);
  const valid = Number.isFinite(numeric) && numeric > 0 && !!date;

  const submit = async () => {
    if (!valid || busy) return;
    const patch: { amount?: number; kind?: IncomeKind; created_at?: string } =
      {};
    if (numeric !== Number(income.amount)) patch.amount = numeric;
    if (kind !== income.kind) patch.kind = kind;
    if (date !== income.created_at.slice(0, 10)) {
      patch.created_at = new Date(`${date}T12:00:00.000Z`).toISOString();
    }
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(income.id, patch);
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
          <div className="text-sm font-semibold">Edit income</div>
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
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            disabled={busy}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-lg tabular-nums outline-none focus:border-brand"
          />

          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            Type
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["salary", "other"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                disabled={busy}
                className={`rounded-xl border px-2 py-2.5 text-sm font-medium ${
                  kind === k
                    ? "border-pos bg-surface-2"
                    : "border-border bg-surface"
                }`}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>

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
