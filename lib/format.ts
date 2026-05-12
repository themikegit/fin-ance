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
