export type { Category } from "./categories";

export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category_id: string | null;
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

export type MonthlyExpense = {
  id: string;
  user_id: string;
  label: string;
  amount: number;
  months: number | null;
  created_at: string;
};

export type Space = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};

export type SpaceRole = "owner" | "member";
export type SpaceMemberStatus = "pending" | "accepted";

export type SpaceMember = {
  id: string;
  space_id: string;
  user_id: string | null;
  invited_email: string;
  role: SpaceRole;
  status: SpaceMemberStatus;
  invited_at: string;
  accepted_at: string | null;
};

export type SpaceSummary = Space & {
  member_count: number;
  role: SpaceRole;
};

export type SpaceMemberView = SpaceMember & {
  display_name: string;
};
