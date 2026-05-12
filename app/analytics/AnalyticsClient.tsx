"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import MonthSwitcher from "@/components/MonthSwitcher";
import { fetchExpenses, fetchIncomes } from "@/lib/client";
import {
  currentMonthKey,
  monthKey,
  shiftMonth,
  formatRSD,
  daysInMonth,
} from "@/lib/format";
import { CATEGORIES, CATEGORY_BY_ID, type CategoryId } from "@/lib/categories";
import type { Expense, Income } from "@/lib/types";

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#eab308",
  "#94a3b8",
];

export default function AnalyticsClient() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [incomes, setIncomes] = useState<Income[] | null>(null);
  const [month, setMonth] = useState<string>(currentMonthKey());
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
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthExpenses = useMemo(
    () => (expenses ?? []).filter((e) => monthKey(e.created_at) === month),
    [expenses, month],
  );
  const prevMonthKey = shiftMonth(month, -1);
  const prevMonthExpenses = useMemo(
    () => (expenses ?? []).filter((e) => monthKey(e.created_at) === prevMonthKey),
    [expenses, prevMonthKey],
  );

  const monthTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const prevTotal = prevMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const incomeTotal = (incomes ?? []).reduce(
    (s, i) => s + Number(i.amount),
    0,
  );
  const balance = incomeTotal - monthTotal;

  const byCategory = useMemo(() => {
    const map = new Map<CategoryId, number>();
    for (const e of monthExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return CATEGORIES.filter((c) => (map.get(c.id) ?? 0) > 0).map((c) => ({
      id: c.id,
      label: `${c.emoji} ${c.label}`,
      value: map.get(c.id) ?? 0,
    }));
  }, [monthExpenses]);

  const daily = useMemo(() => {
    const n = daysInMonth(month);
    const arr = Array.from({ length: n }, (_, i) => ({
      day: i + 1,
      amount: 0,
    }));
    for (const e of monthExpenses) {
      const d = new Date(e.created_at).getDate();
      arr[d - 1].amount += Number(e.amount);
    }
    return arr;
  }, [monthExpenses, month]);

  const topFive = useMemo(
    () =>
      [...monthExpenses]
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 5),
    [monthExpenses],
  );

  const momPct =
    prevTotal === 0
      ? null
      : Math.round(((monthTotal - prevTotal) / prevTotal) * 100);

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

  return (
    <div className="mx-auto max-w-md px-4 pt-2 pb-6 space-y-4">
      <MonthSwitcher value={month} onChange={setMonth} />

      <section className="rounded-2xl border border-border bg-surface p-4 grid grid-cols-3 gap-3">
        <Stat label="Spent" value={formatRSD(monthTotal)} tone="neg" />
        <Stat label="Income" value={formatRSD(incomeTotal)} tone="pos" />
        <Stat
          label="Balance"
          value={formatRSD(balance)}
          tone={balance >= 0 ? "pos" : "neg"}
        />
      </section>

      {momPct !== null ? (
        <div className="text-center text-xs text-muted">
          vs last month:{" "}
          <span className={momPct >= 0 ? "text-neg" : "text-pos"}>
            {momPct >= 0 ? "+" : ""}
            {momPct}%
          </span>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold mb-3">Spending by category</h2>
        {byCategory.length === 0 ? (
          <p className="text-sm text-muted">No spending this month.</p>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={75}
                    strokeWidth={0}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatRSD(Number(v))}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1">
              {byCategory.map((c, i) => {
                const pct = Math.round((c.value / monthTotal) * 100);
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span>{c.label}</span>
                    </div>
                    <div className="tabular-nums">
                      {formatRSD(c.value)}{" "}
                      <span className="text-muted">({pct}%)</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold mb-3">Daily spending</h2>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v) => formatRSD(Number(v))}
                labelFormatter={(l) => `Day ${l}`}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold mb-3">Top expenses</h2>
        {topFive.length === 0 ? (
          <p className="text-sm text-muted">Nothing to show.</p>
        ) : (
          <ul className="space-y-2">
            {topFive.map((e) => {
              const cat = CATEGORY_BY_ID[e.category];
              return (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <span className="text-lg" aria-hidden>
                    {cat.emoji}
                  </span>
                  <span className="flex-1 truncate">
                    {e.name?.trim() || cat.label}
                  </span>
                  <span className="font-semibold text-neg">
                    −{formatRSD(Number(e.amount))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "pos" | "neg";
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <div
        className={`mt-1 text-sm font-semibold tabular-nums ${
          tone === "pos" ? "text-pos" : "text-neg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
