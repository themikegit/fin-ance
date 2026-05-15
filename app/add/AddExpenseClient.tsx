"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import CategoryGrid from "@/components/CategoryGrid";
import Toast from "@/components/Toast";
import { createExpense, fetchCategories } from "@/lib/client";
import type { Category } from "@/lib/categories";
import { formatRSD } from "@/lib/format";

const QUICK = [500, 1000, 2000, 5000] as const;

export default function AddExpenseClient() {
  const [amount, setAmount] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [picking, setPicking] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
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
    return () => {
      cancelled = true;
    };
  }, []);

  const numeric = Number.parseFloat(amount);
  const valid = Number.isFinite(numeric) && numeric > 0;

  const handleAmountChange = (v: string) => {
    const cleaned = v.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const normalized =
      parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
    setAmount(normalized);
  };

  const openPicker = () => {
    if (!valid || saving) return;
    setError(null);
    setPicking(true);
  };

  const reset = () => {
    setAmount("");
    setName("");
    setPicking(false);
    setSaving(false);
    inputRef.current?.focus();
  };

  const save = async (category: Category) => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createExpense({
        amount: numeric,
        category_id: category.id,
        name: name.trim() || null,
      });
      setToast(`Saved ${formatRSD(numeric)}`);
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
          aria-label="Expense amount"
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

      <button
        type="button"
        onClick={openPicker}
        disabled={!valid || saving}
        className="mt-6 w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white shadow-sm transition-all active:scale-[0.99] disabled:opacity-40"
      >
        Add
      </button>

      {error ? (
        <p className="mt-3 text-center text-sm text-neg">{error}</p>
      ) : null}

      {picking ? (
        <>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setPicking(false)}
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
                onClick={() => setPicking(false)}
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

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}
