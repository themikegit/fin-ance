"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Pencil, Trash2, X } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import Toast from "@/components/Toast";
import {
  fetchIncomes,
  createIncome,
  deleteIncome,
  fetchMonthlyExpenses,
  createMonthlyExpense,
  deleteMonthlyExpense,
  fetchSpaces,
  createSpace,
  fetchSpaceMembers,
  inviteSpaceMember,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/client";
import { categoryColor, categoryInitial } from "@/lib/categories";
import { formatRSD, formatDay } from "@/lib/format";
import type {
  Category,
  Income,
  MonthlyExpense,
  SpaceSummary,
  SpaceMemberView,
} from "@/lib/types";

export default function SettingsClient() {
  const { signOut } = useClerk();
  const [incomes, setIncomes] = useState<Income[] | null>(null);
  const [label, setLabel] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [recurring, setRecurring] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [fixed, setFixed] = useState<MonthlyExpense[] | null>(null);
  const [fixedLabel, setFixedLabel] = useState<string>("");
  const [fixedAmount, setFixedAmount] = useState<string>("");
  const [fixedMonths, setFixedMonths] = useState<string>("");
  const [savingFixed, setSavingFixed] = useState<boolean>(false);
  const [pendingFixedDelete, setPendingFixedDelete] = useState<string | null>(
    null,
  );

  const [spaces, setSpaces] = useState<SpaceSummary[] | null>(null);
  const [newSpaceName, setNewSpaceName] = useState<string>("");
  const [creatingSpace, setCreatingSpace] = useState<boolean>(false);

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newCatName, setNewCatName] = useState<string>("");
  const [creatingCat, setCreatingCat] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [inc, fx, sp, cats] = await Promise.all([
          fetchIncomes(),
          fetchMonthlyExpenses(),
          fetchSpaces(),
          fetchCategories(),
        ]);
        if (cancelled) return;
        setIncomes(inc);
        setFixed(fx);
        setSpaces(sp);
        setCategories(cats);
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
      const created = await createIncome({
        label: label.trim(),
        amount: numeric,
        recurring,
      });
      setIncomes((prev) => (prev ? [created, ...prev] : [created]));
      setLabel("");
      setAmount("");
      setRecurring(true);
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

  const fixedNumeric = Number.parseFloat(fixedAmount);
  const fixedValid =
    fixedLabel.trim().length > 0 &&
    Number.isFinite(fixedNumeric) &&
    fixedNumeric > 0;

  const onAddFixed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedValid || savingFixed) return;
    const monthsTrimmed = fixedMonths.trim();
    let monthsValue: number | null = null;
    if (monthsTrimmed) {
      const n = Number.parseInt(monthsTrimmed, 10);
      if (!Number.isInteger(n) || n <= 0) {
        setError("Months must be a positive whole number");
        return;
      }
      monthsValue = n;
    }
    setSavingFixed(true);
    setError(null);
    try {
      const created = await createMonthlyExpense({
        label: fixedLabel.trim(),
        amount: fixedNumeric,
        months: monthsValue,
      });
      setFixed((prev) => (prev ? [created, ...prev] : [created]));
      setFixedLabel("");
      setFixedAmount("");
      setFixedMonths("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingFixed(false);
    }
  };

  const onDeleteFixed = async (id: string) => {
    if (pendingFixedDelete) return;
    setPendingFixedDelete(id);
    const prev = fixed;
    setFixed((arr) => (arr ? arr.filter((i) => i.id !== id) : arr));
    try {
      await deleteMonthlyExpense(id);
    } catch (e) {
      setError((e as Error).message);
      setFixed(prev);
    } finally {
      setPendingFixedDelete(null);
    }
  };

  const onCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSpaceName.trim();
    if (!name || creatingSpace) return;
    setCreatingSpace(true);
    setError(null);
    try {
      const created = await createSpace(name);
      setSpaces((prev) => (prev ? [...prev, created] : [created]));
      setNewSpaceName("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingSpace(false);
    }
  };

  const onCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name || creatingCat) return;
    setCreatingCat(true);
    setError(null);
    try {
      const created = await createCategory({ name });
      setCategories((prev) => (prev ? [...prev, created] : [created]));
      setNewCatName("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingCat(false);
    }
  };

  const onUpdateCategory = async (
    id: string,
    patch: { name: string },
  ) => {
    setError(null);
    try {
      const updated = await updateCategory(id, patch);
      setCategories((prev) =>
        prev ? prev.map((c) => (c.id === id ? updated : c)) : prev,
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onDeleteCategory = async (id: string) => {
    const prev = categories;
    setCategories((arr) => (arr ? arr.filter((c) => c.id !== id) : arr));
    try {
      await deleteCategory(id);
    } catch (err) {
      setError((err as Error).message);
      setCategories(prev);
    }
  };

  const total = (incomes ?? [])
    .filter((i) => i.recurring)
    .reduce((s, i) => s + Number(i.amount), 0);
  const fixedTotal = (fixed ?? []).reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-6 space-y-6">
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Income Sources</h2>
          <p className="mt-1 text-xs text-muted">
            <span className="font-medium">Recurring</span> sources (salary,
            side gigs) apply to every month. Got existing savings, a bonus,
            or starting mid-month? Add a{" "}
            <span className="font-medium">one-time</span> entry called e.g.{" "}
            <span className="font-medium">levelup</span> — it only counts in
            the month you added it, so future months stay clean.
          </p>
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
                  <div className="text-[11px] text-muted">
                    {i.recurring
                      ? "Recurring monthly"
                      : `One-time · ${formatDay(i.created_at)}`}
                  </div>
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
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              disabled={saving}
              className="h-4 w-4 accent-brand"
            />
            <span>
              Recurring monthly{" "}
              <span className="text-muted">
                (uncheck for one-time like &ldquo;levelup&rdquo; or bonus)
              </span>
            </span>
          </label>
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
              Monthly total
            </span>
            <span className="text-sm font-semibold text-pos tabular-nums">
              {formatRSD(total)}
            </span>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Monthly Fixed Expenses</h2>
          <p className="mt-0.5 text-xs text-muted">
            Recurring costs (rent, internet, subscriptions). Counted against
            your monthly balance.
          </p>
        </div>

        {fixed === null ? (
          <p className="px-4 py-4 text-sm text-muted">Loading…</p>
        ) : fixed.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">
            No fixed expenses yet. Add one below.
          </p>
        ) : (
          <ul>
            {fixed.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{i.label}</div>
                  {i.months ? (
                    <div className="text-[11px] text-muted">
                      {i.months} month{i.months === 1 ? "" : "s"} ·{" "}
                      {formatRSD(Number(i.amount) * i.months)} total
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted">Ongoing</div>
                  )}
                </div>
                <div className="text-sm font-semibold text-neg tabular-nums">
                  {formatRSD(Number(i.amount))}
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${i.label}`}
                  onClick={() => onDeleteFixed(i.id)}
                  disabled={pendingFixedDelete === i.id}
                  className="ml-1 p-2 -mr-2 text-muted hover:text-neg disabled:opacity-40"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={onAddFixed}
          className="px-4 py-3 border-t border-border space-y-2"
        >
          <div className="grid grid-cols-6 gap-2">
            <input
              type="text"
              placeholder="Label (e.g. Loan)"
              value={fixedLabel}
              onChange={(e) => setFixedLabel(e.target.value)}
              disabled={savingFixed}
              className="col-span-3 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              value={fixedAmount}
              onChange={(e) =>
                setFixedAmount(e.target.value.replace(/[^\d.]/g, ""))
              }
              disabled={savingFixed}
              className="col-span-2 rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:border-brand"
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Mo."
              value={fixedMonths}
              onChange={(e) =>
                setFixedMonths(e.target.value.replace(/\D/g, ""))
              }
              disabled={savingFixed}
              title="Number of monthly installments (leave blank for ongoing)"
              className="col-span-1 rounded-xl border border-border bg-background px-2 py-2 text-sm tabular-nums text-center outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            disabled={!fixedValid || savingFixed}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add fixed expense
          </button>
        </form>

        {fixed && fixed.length > 0 ? (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-2/40">
            <span className="text-xs uppercase tracking-wide text-muted">
              Total
            </span>
            <span className="text-sm font-semibold text-neg tabular-nums">
              {formatRSD(fixedTotal)}
            </span>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Spaces</h2>
          <p className="mt-0.5 text-xs text-muted">
            Share expenses with another person (e.g. a partner).
          </p>
        </div>

        {spaces === null ? (
          <p className="px-4 py-4 text-sm text-muted">Loading…</p>
        ) : spaces.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">No spaces yet.</p>
        ) : (
          <ul>
            {spaces.map((s) => (
              <SpaceRow
                key={s.id}
                space={s}
                onToast={setToast}
                onError={setError}
              />
            ))}
          </ul>
        )}

        <form onSubmit={onCreateSpace} className="px-4 py-3 border-t border-border space-y-2">
          <input
            type="text"
            placeholder="Space name (e.g. Home)"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            disabled={creatingSpace}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={!newSpaceName.trim() || creatingSpace}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Create space
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Categories</h2>
          <p className="mt-0.5 text-xs text-muted">
            Shared by everyone. Used when adding expenses.
          </p>
        </div>

        {categories === null ? (
          <p className="px-4 py-4 text-sm text-muted">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">No categories yet.</p>
        ) : (
          <ul>
            {categories.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                onSave={(patch) => onUpdateCategory(c.id, patch)}
                onDelete={() => onDeleteCategory(c.id)}
              />
            ))}
          </ul>
        )}

        <form
          onSubmit={onCreateCategory}
          className="px-4 py-3 border-t border-border space-y-2"
        >
          <input
            type="text"
            placeholder="Category name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            disabled={creatingCat}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={!newCatName.trim() || creatingCat}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add category
          </button>
        </form>
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
      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}

function SpaceRow({
  space,
  onToast,
  onError,
}: {
  space: SpaceSummary;
  onToast: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const [members, setMembers] = useState<SpaceMemberView[] | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && members === null) {
      try {
        const m = await fetchSpaceMembers(space.id);
        setMembers(m);
      } catch (e) {
        onError((e as Error).message);
      }
    }
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email || inviting) return;
    setInviting(true);
    try {
      const { inviteUrl: url } = await inviteSpaceMember(space.id, email);
      setInviteUrl(url);
      setInviteEmail("");
      try {
        const m = await fetchSpaceMembers(space.id);
        setMembers(m);
      } catch {
        // ignore — invite still succeeded
      }
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast("Invite link copied");
    } catch {
      onError("Copy failed — long-press to copy manually");
    }
  };

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-2"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{space.name}</div>
          <div className="text-xs text-muted">
            {space.member_count} member{space.member_count === 1 ? "" : "s"} ·{" "}
            {space.role === "owner" ? "Owner" : "Member"}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="px-4 pb-4 space-y-3">
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            {members === null ? (
              <p className="px-3 py-2 text-sm text-muted">Loading…</p>
            ) : members.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted">No members.</p>
            ) : (
              <ul>
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold uppercase">
                      {(m.display_name || m.invited_email).slice(0, 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{m.display_name}</div>
                      <div className="text-[11px] text-muted truncate">
                        {m.role === "owner" ? "Owner" : "Member"} ·{" "}
                        {m.status === "accepted" ? "Joined" : "Pending"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={onInvite} className="space-y-2">
            <input
              type="email"
              placeholder="Invite by email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviting}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={!inviteEmail.trim() || inviting}
              className="w-full rounded-xl bg-brand py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Generate invite link
            </button>
          </form>

          {inviteUrl ? (
            <div className="rounded-xl border border-border bg-background p-3 space-y-2">
              <div className="text-xs text-muted">
                Share this link with the invited person. They must sign in with
                the same email to join.
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-lg bg-surface-2 px-2 py-1.5 text-xs">
                  {inviteUrl}
                </code>
                <button
                  type="button"
                  aria-label="Copy invite link"
                  onClick={() => copy(inviteUrl)}
                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-muted hover:text-foreground"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function CategoryRow({
  category,
  onSave,
  onDelete,
}: {
  category: Category;
  onSave: (patch: { name: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(category.name);
  const [busy, setBusy] = useState<boolean>(false);

  const startEdit = () => {
    setName(category.name);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setName(category.name);
  };

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (trimmedName === category.name) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onSave({ name: trimmedName });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    if (
      !confirm(
        `Delete "${category.name}"? Existing expenses keep their label but lose the link.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <li className="flex items-center gap-2 px-4 py-3 border-b border-border last:border-b-0">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
        <button
          type="button"
          aria-label="Save"
          onClick={submit}
          disabled={!name.trim() || busy}
          className="p-2 text-pos hover:bg-surface-2 rounded-lg disabled:opacity-40"
        >
          <Check size={16} />
        </button>
        <button
          type="button"
          aria-label="Cancel"
          onClick={cancel}
          disabled={busy}
          className="p-2 text-muted hover:bg-surface-2 rounded-lg"
        >
          <X size={16} />
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: categoryColor(category.id) }}
        aria-hidden
      >
        {categoryInitial(category.name)}
      </span>
      <span className="flex-1 text-sm font-medium truncate">
        {category.name}
      </span>
      <button
        type="button"
        aria-label={`Edit ${category.name}`}
        onClick={startEdit}
        disabled={busy}
        className="p-2 text-muted hover:text-foreground disabled:opacity-40"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        aria-label={`Delete ${category.name}`}
        onClick={remove}
        disabled={busy}
        className="p-2 -mr-2 text-muted hover:text-neg disabled:opacity-40"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
