import Header from "@/components/Header";
import AddExpenseClient from "./AddExpenseClient";

export const dynamic = "force-dynamic";

export default function AddPage() {
  return (
    <>
      <Header title="Add Expense" />
      <AddExpenseClient />
    </>
  );
}
