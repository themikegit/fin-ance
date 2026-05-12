"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import {
  fetchIncomes,
  createIncome,
  deleteIncome,
} from "@/lib/client";
import { formatRSD } from "@/lib/format";
import type { Income } from "@/lib/types";

export default function SettingsClient() {
  const { signOut } = useClerk();
  const [incomes, setIncomes] = useState<Income[] | null>(null);
  const [label, setLabel] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchIncomes();
        if (!cancelled) setIncomes(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const numeric = Number.parseFloat(amount);
  const valid = label.trim().length > 0 && Number.isFinite(numeric) && numeric > 0;

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createIncome({ label: label.trim(), amount: numeric });
      setIncomes((prev) => (prev ? [created, ...prev] : [created]));
      setLabel("");
      setAmount("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (pendingDelete) return;
    setPendingDelete(id);
    const prev = incomes;
    setIncomes((arr) => (arr ? arr.filter((i) => i.id !== id) : arr));
    try {
      await deleteIncome(id);
    } catch (e) {
      setError((e as Error).message);
      setIncomes(prev);
    } finally {
      setPendingDelete(null);
    }
  };

  const total = (incomes ?? []).reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-6 space-y-6">
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Monthly Income Sources</h2>
        </div>

        {incomes === null ? (
          <p className="px-4 py-4 text-sm text-muted">Loading…</p>
        ) : incomes.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">
            No income sources yet. Add one below.
          </p>
        ) : (
          <ul>
            {incomes.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{i.label}</div>
                </div>
                <div className="text-sm font-semibold text-pos tabular-nums">
                  {formatRSD(Number(i.amount))}
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${i.label}`}
                  onClick={() => onDelete(i.id)}
                  disabled={pendingDelete === i.id}
                  className="ml-1 p-2 -mr-2 text-muted hover:text-neg disabled:opacity-40"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onAdd} className="px-4 py-3 border-t border-border space-y-2">
          <div className="grid grid-cols-5 gap-2">
            <input
              type="text"
              placeholder="Label (e.g. Salary)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={saving}
              className="col-span-3 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              disabled={saving}
              className="col-span-2 rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            disabled={!valid || saving}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add income
          </button>
        </form>

        {incomes && incomes.length > 0 ? (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-2/40">
            <span className="text-xs uppercase tracking-wide text-muted">
              Total
            </span>
            <span className="text-sm font-semibold text-pos tabular-nums">
              {formatRSD(total)}
            </span>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Other</h2>
        </div>
        <ul className="divide-y divide-border">
          <li className="flex items-center justify-between px-4 py-3 text-sm">
            <span>Currency</span>
            <span className="text-muted">RSD</span>
          </li>
          <li>
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-between px-4 py-3 text-sm text-muted disabled:cursor-not-allowed"
            >
              <span>Export data</span>
              <span className="text-xs">Coming soon</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
              className="flex w-full items-center justify-between px-4 py-3 text-sm text-neg hover:bg-surface-2"
            >
              <span>Sign out</span>
            </button>
          </li>
        </ul>
      </section>

      {error ? <p className="text-sm text-neg text-center">{error}</p> : null}
    </div>
  );
}
