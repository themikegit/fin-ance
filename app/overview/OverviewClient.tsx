"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchCategories,
  fetchExpenses,
  fetchIncomes,
  fetchSettings,
  fetchSpaces,
} from "@/lib/client";
import {
  currentMonthKey,
  formatRSD,
  monthKey,
  monthLabel,
  shiftMonth,
} from "@/lib/format";
import type {
  Category,
  Expense,
  Income,
  SpaceSummary,
  UserSettings,
} from "@/lib/types";

// Validated pair (light + dark, colorblind-safe): income green, spent indigo.
const INCOME_COLOR = "#16a34a";
const SPENT_COLOR = "#6366f1";

type Scope = { kind: "personal" } | { kind: "space"; id: string };

type MonthStat = {
  key: string;
  income: number;
  spent: number;
  net: number;
  items: number;
  current: boolean;
};

function shortMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString("en-US", { month: "short" });
  return m === 1 ? `${label} ${String(y).slice(2)}` : label;
}

function pct(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export default function OverviewClient() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [incomes, setIncomes] = useState<Income[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [scope, setScope] = useState<Scope>({ kind: "personal" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sps, cats, st] = await Promise.all([
          fetchSpaces(),
          fetchCategories(),
          fetchSettings().catch(() => null),
        ]);
        if (cancelled) return;
        setSpaces(sps);
        setCategories(cats);
        setSettings(st);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const spaceId = scope.kind === "space" ? scope.id : undefined;
        const [exps, incs] = await Promise.all([
          fetchExpenses(spaceId),
          fetchIncomes(spaceId),
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
  }, [scope]);

  const categoryById = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // One row per month from the first record through the current month, so
  // gaps show as zero rather than disappearing from the trend.
  const months: MonthStat[] = useMemo(() => {
    if (!expenses || !incomes) return [];
    const spentBy = new Map<string, { spent: number; items: number }>();
    const incomeBy = new Map<string, number>();
    let first: string | null = null;
    for (const e of expenses) {
      const k = monthKey(e.created_at);
      const cur = spentBy.get(k) ?? { spent: 0, items: 0 };
      cur.spent += Number(e.amount);
      cur.items += 1;
      spentBy.set(k, cur);
      if (!first || k < first) first = k;
    }
    for (const i of incomes) {
      const k = monthKey(i.created_at);
      incomeBy.set(k, (incomeBy.get(k) ?? 0) + Number(i.amount));
      if (!first || k < first) first = k;
    }
    if (!first) return [];
    const now = currentMonthKey();
    const out: MonthStat[] = [];
    for (let k = first; k <= now; k = shiftMonth(k, 1)) {
      const s = spentBy.get(k) ?? { spent: 0, items: 0 };
      const income = incomeBy.get(k) ?? 0;
      out.push({
        key: k,
        income,
        spent: s.spent,
        net: income - s.spent,
        items: s.items,
        current: k === now,
      });
      if (out.length > 240) break; // safety valve for bad timestamps
    }
    return out;
  }, [expenses, incomes]);

  const completed = useMemo(() => months.filter((m) => !m.current), [months]);
  const current = months.find((m) => m.current) ?? null;
  const lastMonth = completed.length ? completed[completed.length - 1] : null;
  const beforeLast =
    completed.length > 1 ? completed[completed.length - 2] : null;

  const totals = useMemo(() => {
    const income = months.reduce((s, m) => s + m.income, 0);
    const spent = months.reduce((s, m) => s + m.spent, 0);
    const n = completed.length;
    const avgSpent = n ? completed.reduce((s, m) => s + m.spent, 0) / n : 0;
    const avgIncome = n ? completed.reduce((s, m) => s + m.income, 0) / n : 0;
    const avgNet = n ? completed.reduce((s, m) => s + m.net, 0) / n : 0;
    return { income, spent, net: income - spent, avgSpent, avgIncome, avgNet };
  }, [months, completed]);

  const trend = useMemo(() => {
    // Last 3 completed months vs the 3 before them.
    if (completed.length < 2) return null;
    const recent = completed.slice(-3);
    const prior = completed.slice(-6, -3);
    if (prior.length === 0) return null;
    const avg = (arr: MonthStat[]) =>
      arr.reduce((s, m) => s + m.spent, 0) / arr.length;
    const a = avg(recent);
    const b = avg(prior);
    return { recent: a, prior: b, pct: pct(a, b), n: recent.length, np: prior.length };
  }, [completed]);

  const extremes = useMemo(() => {
    if (completed.length === 0) return null;
    const withSpend = completed.filter((m) => m.spent > 0);
    const highest = withSpend.length
      ? withSpend.reduce((a, b) => (b.spent > a.spent ? b : a))
      : null;
    const lowest = withSpend.length
      ? withSpend.reduce((a, b) => (b.spent < a.spent ? b : a))
      : null;
    const bestNet = completed.reduce((a, b) => (b.net > a.net ? b : a));
    return { highest, lowest, bestNet };
  }, [completed]);

  const goal =
    scope.kind === "personal" ? settings?.monthly_savings ?? null : null;
  const goalHits = useMemo(() => {
    if (!goal) return null;
    const eligible = completed.filter((m) => m.income > 0);
    const hits = eligible.filter((m) => m.net >= goal).length;
    return { hits, of: eligible.length };
  }, [completed, goal]);

  const chartData = useMemo(
    () =>
      months.slice(-12).map((m) => ({
        key: m.key,
        label: shortMonth(m.key),
        Income: Math.round(m.income),
        Spent: Math.round(m.spent),
      })),
    [months],
  );

  const lastMonthCategories = useMemo(() => {
    if (!lastMonth || !expenses) return [];
    const totals = new Map<string, number>();
    for (const e of expenses) {
      if (monthKey(e.created_at) !== lastMonth.key) continue;
      const k = e.category_id ?? "none";
      totals.set(k, (totals.get(k) ?? 0) + Number(e.amount));
    }
    return [...totals.entries()]
      .map(([id, value]) => ({
        id,
        label: id === "none" ? "Uncategorized" : categoryById.get(id)?.name ?? "Deleted",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [expenses, lastMonth, categoryById]);

  const allTimeCategories = useMemo(() => {
    if (!expenses) return [];
    const totals = new Map<string, number>();
    for (const e of expenses) {
      const k = e.category_id ?? "none";
      totals.set(k, (totals.get(k) ?? 0) + Number(e.amount));
    }
    const rows = [...totals.entries()]
      .map(([id, value]) => ({
        id,
        label: id === "none" ? "Uncategorized" : categoryById.get(id)?.name ?? "Deleted",
        value,
      }))
      .sort((a, b) => b.value - a.value);
    const top = rows.slice(0, 6);
    const rest = rows.slice(6).reduce((s, r) => s + r.value, 0);
    if (rest > 0) top.push({ id: "other", label: "Other", value: rest });
    return top;
  }, [expenses, categoryById]);

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

  const listed = [...months].reverse();

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

      {months.length === 0 ? (
        <div className="pt-8 text-center text-sm text-muted">
          Nothing to summarize yet. Log a few expenses and income first.
        </div>
      ) : (
        <>
          {/* All-time totals */}
          <section className="grid grid-cols-2 gap-3">
            <Tile label="Total income" value={totals.income} tone="pos" />
            <Tile label="Total spent" value={totals.spent} tone="neg" />
            <Tile
              label="Net saved"
              value={totals.net}
              tone={totals.net >= 0 ? "pos" : "neg"}
              hint={`${months.length} month${months.length === 1 ? "" : "s"} tracked`}
            />
            <Tile
              label="Avg spent / month"
              value={totals.avgSpent}
              tone="neutral"
              hint={
                completed.length
                  ? `over ${completed.length} completed`
                  : "no completed months yet"
              }
            />
          </section>

          {/* Last month */}
          {lastMonth ? (
            <section className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Last month</h2>
                <span className="text-xs text-muted">
                  {monthLabel(lastMonth.key)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Mini label="Income" value={lastMonth.income} tone="pos" />
                <Mini label="Spent" value={lastMonth.spent} tone="neg" />
                <Mini
                  label="Net"
                  value={lastMonth.net}
                  tone={lastMonth.net >= 0 ? "pos" : "neg"}
                />
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted">
                {beforeLast ? (
                  <li>
                    Spent{" "}
                    <Delta value={pct(lastMonth.spent, beforeLast.spent)} invert />{" "}
                    vs {monthLabel(beforeLast.key)}
                  </li>
                ) : null}
                {completed.length > 1 ? (
                  <li>
                    Spent <Delta value={pct(lastMonth.spent, totals.avgSpent)} invert />{" "}
                    vs your monthly average
                  </li>
                ) : null}
                {goal ? (
                  <li>
                    Savings goal {formatRSD(goal)}:{" "}
                    <span
                      className={
                        lastMonth.net >= goal ? "text-pos" : "text-neg"
                      }
                    >
                      {lastMonth.net >= goal
                        ? "reached"
                        : `missed by ${formatRSD(goal - lastMonth.net)}`}
                    </span>
                  </li>
                ) : null}
              </ul>
              {lastMonthCategories.length > 0 ? (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted">
                    Top categories
                  </div>
                  <ul className="mt-1 space-y-1">
                    {lastMonthCategories.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="truncate">{c.label}</span>
                        <span className="tabular-nums">
                          {formatRSD(c.value)}{" "}
                          <span className="text-muted">
                            ({Math.round((c.value / lastMonth.spent) * 100)}%)
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Trend chart */}
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold mb-1">Income vs spent</h2>
            <p className="text-xs text-muted mb-3">
              Last {chartData.length} month{chartData.length === 1 ? "" : "s"}
              {current ? " · current month is partial" : ""}
            </p>
            <div className="h-48">
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={{ width: 360, height: 192 }}
              >
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                  barGap={2}
                  barCategoryGap="25%"
                >
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--muted)" }}
                    tickLine={false}
                    axisLine={false}
                    interval={chartData.length > 8 ? 1 : 0}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "var(--surface-2)" }}
                    formatter={(v) => formatRSD(Number(v))}
                    labelFormatter={(_, payload) => {
                      const k = payload?.[0]?.payload?.key as string | undefined;
                      return k ? monthLabel(k) : "";
                    }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: "var(--muted)" }}
                  />
                  <Bar
                    dataKey="Income"
                    fill={INCOME_COLOR}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="Spent"
                    fill={SPENT_COLOR}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Trends & stats */}
          {completed.length > 0 ? (
            <section className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="px-4 py-3 border-b border-border text-sm font-semibold">
                Trends &amp; stats
              </div>
              <ul className="divide-y divide-border text-sm">
                {trend ? (
                  <Stat
                    label={`Spending trend (last ${trend.n} vs prior ${trend.np})`}
                    value={
                      <>
                        <Delta value={trend.pct} invert />{" "}
                        <span className="text-muted">
                          {formatRSD(trend.recent)} / mo
                        </span>
                      </>
                    }
                  />
                ) : null}
                <Stat
                  label="Average income / month"
                  value={<span className="text-pos">{formatRSD(totals.avgIncome)}</span>}
                />
                <Stat
                  label="Average net / month"
                  value={
                    <span className={totals.avgNet >= 0 ? "text-pos" : "text-neg"}>
                      {formatRSD(totals.avgNet)}
                    </span>
                  }
                />
                {goalHits && goalHits.of > 0 ? (
                  <Stat
                    label={`Savings goal reached (${formatRSD(goal!)})`}
                    value={`${goalHits.hits} of ${goalHits.of} months`}
                  />
                ) : null}
                {extremes?.highest ? (
                  <Stat
                    label="Highest spending month"
                    value={
                      <>
                        {monthLabel(extremes.highest.key)}{" "}
                        <span className="text-neg">
                          {formatRSD(extremes.highest.spent)}
                        </span>
                      </>
                    }
                  />
                ) : null}
                {extremes?.lowest && extremes.lowest !== extremes.highest ? (
                  <Stat
                    label="Lowest spending month"
                    value={
                      <>
                        {monthLabel(extremes.lowest.key)}{" "}
                        <span className="text-pos">
                          {formatRSD(extremes.lowest.spent)}
                        </span>
                      </>
                    }
                  />
                ) : null}
                {extremes ? (
                  <Stat
                    label="Best net month"
                    value={
                      <>
                        {monthLabel(extremes.bestNet.key)}{" "}
                        <span className={extremes.bestNet.net >= 0 ? "text-pos" : "text-neg"}>
                          {formatRSD(extremes.bestNet.net)}
                        </span>
                      </>
                    }
                  />
                ) : null}
              </ul>
            </section>
          ) : null}

          {/* All-time categories */}
          {allTimeCategories.length > 0 ? (
            <section className="rounded-2xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold mb-3">
                Where it went (all time)
              </h2>
              <ul className="space-y-2">
                {allTimeCategories.map((c) => {
                  const share = totals.spent > 0 ? c.value / totals.spent : 0;
                  return (
                    <li key={c.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{c.label}</span>
                        <span className="tabular-nums shrink-0">
                          {formatRSD(c.value)}{" "}
                          <span className="text-muted">
                            ({Math.round(share * 100)}%)
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(2, share * 100)}%`,
                            background: SPENT_COLOR,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {/* Month by month */}
          <section className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-2 px-4 py-2 border-b border-border text-[11px] uppercase tracking-wide text-muted">
              <span>Month</span>
              <span className="text-right">Income</span>
              <span className="text-right">Spent</span>
              <span className="text-right">Net</span>
            </div>
            <ul className="divide-y divide-border">
              {listed.map((m) => (
                <li
                  key={m.key}
                  className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 text-xs tabular-nums"
                >
                  <span className="truncate">
                    {shortMonth(m.key)}
                    {m.current ? (
                      <span className="text-muted"> · so far</span>
                    ) : null}
                  </span>
                  <span className="text-right text-pos">
                    {compact(m.income)}
                  </span>
                  <span className="text-right text-neg">{compact(m.spent)}</span>
                  <span
                    className={`text-right font-medium ${
                      m.net >= 0 ? "text-pos" : "text-neg"
                    }`}
                  >
                    {compact(m.net)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

// Compact number for the dense table: 52 300 → "52.3k"
function compact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

function Tile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "pos" | "neg" | "neutral";
  hint?: string;
}) {
  const color =
    tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${color}`}>
        {formatRSD(value)}
      </div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted">{hint}</div> : null}
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pos" | "neg";
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={`mt-1 text-sm font-semibold tabular-nums ${
          tone === "pos" ? "text-pos" : "text-neg"
        }`}
      >
        {formatRSD(value)}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-muted">{label}</span>
      <span className="text-right tabular-nums font-medium shrink-0">{value}</span>
    </li>
  );
}

// Percentage change badge. `invert` = a rise is bad (spending).
function Delta({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-muted">n/a</span>;
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span className={good ? "text-pos" : "text-neg"}>
      {value > 0 ? "+" : ""}
      {value}%
    </span>
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
