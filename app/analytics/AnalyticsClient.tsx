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
import {
  fetchCategories,
  fetchExpenses,
  fetchIncomes,
  fetchMonthlyExpenses,
  fetchSpaces,
  fetchSpaceMembers,
} from "@/lib/client";
import {
  currentMonthKey,
  monthKey,
  shiftMonth,
  formatRSD,
  daysInMonth,
} from "@/lib/format";
import { categoryColor, categoryInitial } from "@/lib/categories";
import type {
  Category,
  Expense,
  Income,
  MonthlyExpense,
  SpaceSummary,
  SpaceMemberView,
} from "@/lib/types";

const CATEGORY_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#eab308",
  "#94a3b8",
];

const MEMBER_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#eab308",
];

type Scope = { kind: "personal" } | { kind: "space"; id: string };

export default function AnalyticsClient() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [incomes, setIncomes] = useState<Income[] | null>(null);
  const [fixed, setFixed] = useState<MonthlyExpense[]>([]);
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<SpaceMemberView[]>([]);
  const [scope, setScope] = useState<Scope>({ kind: "personal" });
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [error, setError] = useState<string | null>(null);

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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const inSpace = scope.kind === "space";

  const fixedCategory = useMemo(
    () =>
      categories.find((c) => c.name.toLowerCase() === "fixed") ?? null,
    [categories],
  );

  const fixedAsExpenses = useMemo<Expense[]>(
    () =>
      fixed.map((f) => ({
        id: `fixed:${f.id}`,
        user_id: f.user_id,
        amount: Number(f.amount),
        category_id: fixedCategory?.id ?? null,
        name: f.label,
        created_at: f.created_at,
      })),
    [fixed, fixedCategory],
  );

  const monthExpenses = useMemo(
    () =>
      [...(expenses ?? []), ...fixedAsExpenses].filter(
        (e) => monthKey(e.created_at) === month,
      ),
    [expenses, fixedAsExpenses, month],
  );
  const prevMonthKey = shiftMonth(month, -1);
  const prevMonthExpenses = useMemo(
    () =>
      [...(expenses ?? []), ...fixedAsExpenses].filter(
        (e) => monthKey(e.created_at) === prevMonthKey,
      ),
    [expenses, fixedAsExpenses, prevMonthKey],
  );

  const monthTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const prevTotal = prevMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const incomeTotal = (incomes ?? []).reduce(
    (s, i) => s + Number(i.amount),
    0,
  );
  const monthFixedTotal = monthExpenses
    .filter((e) => e.id.startsWith("fixed:"))
    .reduce((s, e) => s + Number(e.amount), 0);
  const balance = incomeTotal - monthTotal;

  const byCategory = useMemo(() => {
    const totals = new Map<string, { label: string; value: number }>();
    for (const e of monthExpenses) {
      const cat = e.category_id ? categoryById.get(e.category_id) : null;
      const key = e.category_id ?? "uncategorized";
      const label = cat?.name ?? "Uncategorized";
      const prev = totals.get(key);
      if (prev) {
        prev.value += Number(e.amount);
      } else {
        totals.set(key, { label, value: Number(e.amount) });
      }
    }
    return [...totals.entries()]
      .map(([id, v]) => ({ id, label: v.label, value: v.value }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, categoryById]);

  const byMember = useMemo(() => {
    if (!inSpace) return [];
    const totals = new Map<string, number>();
    for (const e of monthExpenses) {
      totals.set(e.user_id, (totals.get(e.user_id) ?? 0) + Number(e.amount));
    }
    const nameById = new Map<string, string>();
    for (const m of members) {
      if (m.user_id) nameById.set(m.user_id, m.display_name);
    }
    return [...totals.entries()]
      .map(([userId, value]) => ({
        id: userId,
        label: nameById.get(userId) ?? "Member",
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, members, inSpace]);

  const daily = useMemo(() => {
    const n = daysInMonth(month);
    const arr = Array.from({ length: n }, (_, i) => ({
      day: i + 1,
      amount: 0,
    }));
    for (const e of monthExpenses) {
      if (e.id.startsWith("fixed:")) continue;
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

  const memberNameByUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of members) {
      if (mem.user_id) m.set(mem.user_id, mem.display_name);
    }
    return m;
  }, [members]);

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
          <Stat label="Spent" value={formatRSD(monthTotal)} tone="neg" />
          <Stat label="Income" value={formatRSD(incomeTotal)} tone="pos" />
          <Stat
            label="Balance"
            value={formatRSD(balance)}
            tone={balance >= 0 ? "pos" : "neg"}
          />
        </div>
        {monthFixedTotal > 0 ? (
          <div className="mt-2 text-[11px] text-muted">
            Spent includes {formatRSD(monthFixedTotal)} from fixed monthly
            expenses.
          </div>
        ) : null}
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

      {inSpace ? (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold mb-3">Spending by member</h2>
          {byMember.length === 0 ? (
            <p className="text-sm text-muted">No spending this month.</p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byMember}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={45}
                      outerRadius={75}
                      strokeWidth={0}
                    >
                      {byMember.map((_, i) => (
                        <Cell
                          key={i}
                          fill={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                        />
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
                {byMember.map((m, i) => {
                  const pct = Math.round((m.value / monthTotal) * 100);
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            background: MEMBER_COLORS[i % MEMBER_COLORS.length],
                          }}
                        />
                        <span className="truncate">{m.label}</span>
                      </div>
                      <div className="tabular-nums shrink-0">
                        {formatRSD(m.value)}{" "}
                        <span className="text-muted">({pct}%)</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
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
                      <Cell
                        key={i}
                        fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                      />
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
                        style={{
                          background:
                            CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        }}
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
              const cat = e.category_id ? categoryById.get(e.category_id) : null;
              const catName = cat?.name || "Uncategorized";
              const by = inSpace
                ? memberNameByUserId.get(e.user_id) ?? "Member"
                : null;
              return (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white shrink-0"
                    style={{ background: categoryColor(cat?.id) }}
                    aria-hidden
                  >
                    {categoryInitial(catName)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      {e.name?.trim() || catName}
                    </div>
                    {by ? (
                      <div className="text-[11px] text-muted truncate">
                        {by}
                      </div>
                    ) : null}
                  </div>
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
