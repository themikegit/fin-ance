import Header from "@/components/Header";
import OverviewClient from "./OverviewClient";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  return (
    <>
      <Header title="Overview" />
      <OverviewClient />
    </>
  );
}
