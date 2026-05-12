import Header from "@/components/Header";
import ExpensesClient from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default function ExpensesPage() {
  return (
    <>
      <Header title="Expenses" />
      <ExpensesClient />
    </>
  );
}
