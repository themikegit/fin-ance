"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import CategoryGrid from "@/components/CategoryGrid";
import MonthSwitcher from "@/components/MonthSwitcher";
import Toast from "@/components/Toast";
import {
  createExpense,
  createIncome,
  fetchCategories,
  fetchExpenses,
  fetchIncomes,
  fetchSettings,
} from "@/lib/client";
import type { Category } from "@/lib/categories";
import type { Expense, Income, IncomeKind, UserSettings } from "@/lib/types";
import {
  currentMonthKey,
  daysLeftInMonth,
  formatRSD,
  monthKey,
  monthToISO,
  sumIncomesForMonth,
} from "@/lib/format";

const QUICK = [500, 1000, 2000, 5000] as const;

type Sheet = "expense" | "income" | null;

export default function AddExpenseClient() {
  const [amount, setAmount] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [sheet, setSheet] = useState<Sheet>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [incomes, setIncomes] = useState<Income[] | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await fetchCategories();
        if (!cancelled) setCategories(cats);
      } catch {
        // silent — show empty UI states
      }
    })();
    (async () => {
      // Budget data is best-effort: if any of it fails the form still works,
      // we just hide the daily allowance card.
      try {
        const [exps, incs, st] = await Promise.all([
          fetchExpenses(),
          fetchIncomes(),
          fetchSettings(),
        ]);
        if (cancelled) return;
        setExpenses(exps);
        setIncomes(incs);
        setSettings(st);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Daily allowance for the *current* calendar month (the month switcher
  // below only affects where new entries are filed).
  const budget = useMemo(() => {
    if (!expenses || !incomes || !settings) return null;
    const thisMonth = currentMonthKey();
    const income = sumIncomesForMonth(incomes, thisMonth);
    if (income <= 0) return null;
    const spent = expenses
      .filter((e) => monthKey(e.created_at) === thisMonth)
      .reduce((s, e) => s + Number(e.amount), 0);
    const savings = settings.monthly_savings ?? 0;
    const left = income - spent - savings;
    const daysLeft = daysLeftInMonth();
    return { income, spent, savings, left, daysLeft, perDay: left / daysLeft };
  }, [expenses, incomes, settings]);

  const numeric = Number.parseFloat(amount);
  const valid = Number.isFinite(numeric) && numeric > 0;

  // Current month → let the DB stamp now() (keeps day-level data for charts).
  // Other months → noon on the 1st so the month reads back correctly.
  const createdAt = month === currentMonthKey() ? undefined : monthToISO(month);

  const handleAmountChange = (v: string) => {
    const cleaned = v.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const normalized =
      parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
    setAmount(normalized);
  };

  const openSheet = (which: Exclude<Sheet, null>) => {
    if (!valid || saving) return;
    setError(null);
    setSheet(which);
  };

  const reset = () => {
    setAmount("");
    setName("");
    setSheet(null);
    setSaving(false);
    inputRef.current?.focus();
  };

  const save = async (category: Category) => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createExpense({
        amount: numeric,
        category_id: category.id,
        name: name.trim() || null,
        created_at: createdAt,
      });
      setExpenses((es) => (es ? [created, ...es] : es));
      setToast(`Saved ${formatRSD(numeric)}`);
      reset();
    } catch (e) {
      setError((e as Error).message || "Failed to save");
      setSaving(false);
    }
  };

  const saveIncome = async (kind: IncomeKind) => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createIncome({
        amount: numeric,
        kind,
        created_at: createdAt,
      });
      setIncomes((arr) => (arr ? [created, ...arr] : arr));
      setToast(`Income ${formatRSD(numeric)}`);
      reset();
    } catch (e) {
      setError((e as Error).message || "Failed to save");
      setSaving(false);
    }
  };

  const otherCategory =
    categories.find((c) => c.name.toLowerCase() === "other") ??
    categories[categories.length - 1] ??
    null;

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      {budget ? (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 ${
            budget.left >= 0
              ? "border-border bg-surface"
              : "border-neg/40 bg-neg/5"
          }`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">
              Left to spend per day
            </div>
            <div
              className={`text-xl font-bold tabular-nums ${
                budget.left >= 0 ? "text-pos" : "text-neg"
              }`}
            >
              {formatRSD(budget.perDay)}
            </div>
          </div>
          <div className="mt-1 text-xs text-muted">
            {formatRSD(budget.left)} left this month · {budget.daysLeft} day
            {budget.daysLeft === 1 ? "" : "s"} to go
            {budget.savings > 0
              ? ` · after ${formatRSD(budget.savings)} savings`
              : ""}
          </div>
        </div>
      ) : null}

      <label
        htmlFor="amount"
        className="block text-xs font-medium uppercase tracking-wide text-muted mb-2"
      >
        Amount (RSD)
      </label>
      <div className="rounded-3xl border border-border bg-surface px-5 py-6 shadow-sm">
        <input
          ref={inputRef}
          id="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="w-full bg-transparent text-center text-5xl font-bold tabular-nums outline-none placeholder:text-muted/40"
          aria-label="Amount"
        />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setAmount(String(q))}
            className="rounded-2xl border border-border bg-surface px-2 py-3 text-sm font-medium text-foreground hover:bg-surface-2 active:scale-95"
          >
            {q.toLocaleString("sr-RS")}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <MonthSwitcher value={month} onChange={setMonth} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => openSheet("expense")}
          disabled={!valid || saving}
          className="col-span-2 rounded-2xl bg-brand py-4 text-base font-semibold text-white shadow-sm transition-all active:scale-[0.99] disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => openSheet("income")}
          disabled={!valid || saving}
          className="col-span-1 rounded-2xl border border-pos/40 bg-surface py-4 text-base font-semibold text-pos shadow-sm transition-all active:scale-[0.99] hover:bg-surface-2 disabled:opacity-40"
        >
          Income
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-center text-sm text-neg">{error}</p>
      ) : null}

      {sheet === "expense" ? (
        <>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSheet(null)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-8 shadow-2xl animate-slide-up safe-pb">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">Amount</div>
                <div className="text-2xl font-bold tabular-nums">
                  {formatRSD(numeric)}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSheet(null)}
                className="rounded-full p-2 text-muted hover:bg-surface-2"
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              placeholder="What was it? (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className="mb-4 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-brand"
            />

            <CategoryGrid
              categories={categories}
              onPick={save}
              disabled={saving}
            />

            {otherCategory ? (
              <button
                type="button"
                onClick={() => save(otherCategory)}
                disabled={saving}
                className="mt-4 w-full rounded-2xl border border-border bg-surface-2 py-3 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
              >
                Skip (save as {otherCategory.name})
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {sheet === "income" ? (
        <>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSheet(null)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-8 shadow-2xl animate-slide-up safe-pb">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">Income</div>
                <div className="text-2xl font-bold tabular-nums text-pos">
                  {formatRSD(numeric)}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSheet(null)}
                className="rounded-full p-2 text-muted hover:bg-surface-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => saveIncome("salary")}
                disabled={saving}
                className="rounded-2xl border border-border bg-surface-2 py-5 text-base font-semibold hover:border-pos disabled:opacity-50"
              >
                Salary
              </button>
              <button
                type="button"
                onClick={() => saveIncome("other")}
                disabled={saving}
                className="rounded-2xl border border-border bg-surface-2 py-5 text-base font-semibold hover:border-pos disabled:opacity-50"
              >
                Other
              </button>
            </div>
          </div>
        </>
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}
