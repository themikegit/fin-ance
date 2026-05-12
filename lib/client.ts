"use client";

import type { Expense, Income } from "./types";
import type { CategoryId } from "./categories";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `request_failed_${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchExpenses(): Promise<Expense[]> {
  const res = await fetch("/api/expenses", { cache: "no-store" });
  const data = await jsonOrThrow<{ expenses: Expense[] }>(res);
  return data.expenses;
}

export async function createExpense(input: {
  amount: number;
  category: CategoryId;
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

export async function fetchIncomes(): Promise<Income[]> {
  const res = await fetch("/api/incomes", { cache: "no-store" });
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
