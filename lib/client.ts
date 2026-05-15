"use client";

import type {
  Category,
  Expense,
  Income,
  MonthlyExpense,
  SpaceSummary,
  SpaceMemberView,
} from "./types";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `request_failed_${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchExpenses(spaceId?: string | null): Promise<Expense[]> {
  const url = spaceId
    ? `/api/expenses?space_id=${encodeURIComponent(spaceId)}`
    : "/api/expenses";
  const res = await fetch(url, { cache: "no-store" });
  const data = await jsonOrThrow<{ expenses: Expense[] }>(res);
  return data.expenses;
}

export async function createExpense(input: {
  amount: number;
  category_id: string;
  name?: string | null;
}): Promise<Expense> {
  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ expense: Expense }>(res);
  return data.expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
  await jsonOrThrow<{ ok: true }>(res);
}

export async function fetchIncomes(spaceId?: string | null): Promise<Income[]> {
  const url = spaceId
    ? `/api/incomes?space_id=${encodeURIComponent(spaceId)}`
    : "/api/incomes";
  const res = await fetch(url, { cache: "no-store" });
  const data = await jsonOrThrow<{ incomes: Income[] }>(res);
  return data.incomes;
}

export async function createIncome(input: {
  label: string;
  amount: number;
}): Promise<Income> {
  const res = await fetch("/api/incomes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ income: Income }>(res);
  return data.income;
}

export async function deleteIncome(id: string): Promise<void> {
  const res = await fetch(`/api/incomes/${id}`, { method: "DELETE" });
  await jsonOrThrow<{ ok: true }>(res);
}

export async function fetchMonthlyExpenses(
  spaceId?: string | null,
): Promise<MonthlyExpense[]> {
  const url = spaceId
    ? `/api/monthly-expenses?space_id=${encodeURIComponent(spaceId)}`
    : "/api/monthly-expenses";
  const res = await fetch(url, { cache: "no-store" });
  const data = await jsonOrThrow<{ monthly_expenses: MonthlyExpense[] }>(res);
  return data.monthly_expenses;
}

export async function createMonthlyExpense(input: {
  label: string;
  amount: number;
  months?: number | null;
}): Promise<MonthlyExpense> {
  const res = await fetch("/api/monthly-expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ monthly_expense: MonthlyExpense }>(res);
  return data.monthly_expense;
}

export async function deleteMonthlyExpense(id: string): Promise<void> {
  const res = await fetch(`/api/monthly-expenses/${id}`, { method: "DELETE" });
  await jsonOrThrow<{ ok: true }>(res);
}

export async function fetchSpaces(): Promise<SpaceSummary[]> {
  const res = await fetch("/api/spaces", { cache: "no-store" });
  const data = await jsonOrThrow<{ spaces: SpaceSummary[] }>(res);
  return data.spaces;
}

export async function createSpace(name: string): Promise<SpaceSummary> {
  const res = await fetch("/api/spaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await jsonOrThrow<{ space: SpaceSummary }>(res);
  return data.space;
}

export async function fetchSpaceMembers(
  spaceId: string,
): Promise<SpaceMemberView[]> {
  const res = await fetch(`/api/spaces/${spaceId}/members`, {
    cache: "no-store",
  });
  const data = await jsonOrThrow<{ members: SpaceMemberView[] }>(res);
  return data.members;
}

export async function inviteSpaceMember(
  spaceId: string,
  email: string,
): Promise<{ token: string; inviteUrl: string }> {
  const res = await fetch(`/api/spaces/${spaceId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return jsonOrThrow<{ token: string; inviteUrl: string }>(res);
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories", { cache: "no-store" });
  const data = await jsonOrThrow<{ categories: Category[] }>(res);
  return data.categories;
}

export async function createCategory(input: {
  name: string;
}): Promise<Category> {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ category: Category }>(res);
  return data.category;
}

export async function updateCategory(
  id: string,
  patch: { name: string },
): Promise<Category> {
  const res = await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await jsonOrThrow<{ category: Category }>(res);
  return data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
  await jsonOrThrow<{ ok: true }>(res);
}
