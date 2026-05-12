import type { CategoryId } from "./categories";

export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category: CategoryId;
  name: string | null;
  created_at: string;
};

export type Income = {
  id: string;
  user_id: string;
  label: string;
  amount: number;
  created_at: string;
};
