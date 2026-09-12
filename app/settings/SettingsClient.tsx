"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Pencil, Trash2, X } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import Toast from "@/components/Toast";
import {
  fetchSpaces,
  createSpace,
  fetchSpaceMembers,
  inviteSpaceMember,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchSettings,
  updateSettings,
} from "@/lib/client";
import { categoryColor, categoryInitial } from "@/lib/categories";
import { formatRSD } from "@/lib/format";
import type {
  Category,
  SpaceSummary,
  SpaceMemberView,
  UserSettings,
} from "@/lib/types";

export default function SettingsClient() {
  const { signOut } = useClerk();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [spaces, setSpaces] = useState<SpaceSummary[] | null>(null);
  const [newSpaceName, setNewSpaceName] = useState<string>("");
  const [creatingSpace, setCreatingSpace] = useState<boolean>(false);

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newCatName, setNewCatName] = useState<string>("");
  const [creatingCat, setCreatingCat] = useState<boolean>(false);

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [savingsInput, setSavingsInput] = useState<string>("");
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sp, cats, st] = await Promise.all([
          fetchSpaces(),
          fetchCategories(),
          fetchSettings(),
        ]);
        if (cancelled) return;
        setSpaces(sp);
        setCategories(cats);
        setSettings(st);
        setSavingsInput(
          st.monthly_savings != null ? String(st.monthly_savings) : "",
        );
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const savingsNumeric = Number.parseFloat(savingsInput);
  const savingsValid =
    savingsInput.trim() === "" ||
    (Number.isFinite(savingsNumeric) && savingsNumeric >= 0);
  const savingsDirty =
    settings !== null &&
    (savingsInput.trim() === ""
      ? settings.monthly_savings !== null
      : savingsNumeric !== settings.monthly_savings);

  const onSaveSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savingsValid || !savingsDirty || savingSettings) return;
    setSavingSettings(true);
    setError(null);
    try {
      const next = await updateSettings({
        monthly_savings: savingsInput.trim() === "" ? null : savingsNumeric,
      });
      setSettings(next);
      setSavingsInput(
        next.monthly_savings != null ? String(next.monthly_savings) : "",
      );
      setToast(
        next.monthly_savings != null
          ? `Savings goal set to ${formatRSD(next.monthly_savings)}`
          : "Savings goal cleared",
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-6 space-y-6">
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Monthly Savings Goal</h2>
          <p className="mt-0.5 text-xs text-muted">
            How much you want to set aside each month. The Add screen uses it
            to show how much you can still spend per day:
            (income − spent − savings) ÷ days left in the month.
          </p>
        </div>

        {settings === null ? (
          <p className="px-4 py-4 text-sm text-muted">Loading…</p>
        ) : (
          <form onSubmit={onSaveSavings} className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 50000"
                value={savingsInput}
                onChange={(e) =>
                  setSavingsInput(e.target.value.replace(/[^\d.]/g, ""))
                }
                disabled={savingSettings}
                aria-label="Monthly savings goal (RSD)"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:border-brand"
              />
              <span className="text-xs text-muted">RSD / month</span>
            </div>
            <button
              type="submit"
              disabled={!savingsValid || !savingsDirty || savingSettings}
              className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {settings.monthly_savings != null && savingsInput.trim() === ""
                ? "Clear goal"
                : "Save goal"}
            </button>
          </form>
        )}

        {settings?.monthly_savings != null ? (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-2/40">
            <span className="text-xs uppercase tracking-wide text-muted">
              Current goal
            </span>
            <span className="text-sm font-semibold text-pos tabular-nums">
              {formatRSD(settings.monthly_savings)}
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
