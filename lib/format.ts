export function formatRSD(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("sr-RS")} RSD`;
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthBoundsISO(key: string): { from: string; to: string } {
  const [y, m] = key.split("-").map(Number);
  const from = new Date(y, m - 1, 1, 0, 0, 0, 0).toISOString();
  const to = new Date(y, m, 1, 0, 0, 0, 0).toISOString();
  return { from, to };
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

// Sum a list of income-shaped rows for the given month key:
// recurring rows always count; non-recurring count only in the month
// their created_at falls in.
export function sumIncomesForMonth(
  incomes: { amount: number; recurring: boolean; created_at: string }[],
  monthKeyValue: string,
): number {
  let total = 0;
  for (const i of incomes) {
    if (i.recurring) {
      total += Number(i.amount);
    } else if (monthKey(i.created_at) === monthKeyValue) {
      total += Number(i.amount);
    }
  }
  return total;
}
