import Header from "@/components/Header";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" />
      <SettingsClient />
    </>
  );
}
