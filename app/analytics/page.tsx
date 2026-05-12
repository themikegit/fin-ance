import Header from "@/components/Header";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <>
      <Header title="Analytics" />
      <AnalyticsClient />
    </>
  );
}
