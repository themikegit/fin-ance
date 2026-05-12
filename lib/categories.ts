export const CATEGORIES = [
  { id: "gas",         label: "Gas",         emoji: "⛽" },
  { id: "groceries",   label: "Groceries",   emoji: "🛒" },
  { id: "housing",     label: "Housing",     emoji: "🏠" },
  { id: "pharmacy",    label: "Pharmacy",    emoji: "💊" },
  { id: "bills",       label: "Bills",       emoji: "📄" },
  { id: "restaurants", label: "Restaurants", emoji: "🍽️" },
  { id: "other",       label: "Other",       emoji: "📦" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];

export const CATEGORY_BY_ID: Record<CategoryId, (typeof CATEGORIES)[number]> =
  Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
    CategoryId,
    (typeof CATEGORIES)[number]
  >;

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && (CATEGORY_IDS as string[]).includes(value);
}
