import { requireAdminSession } from "@/src/lib/auth-guard";
import { getSystemSettingsAction } from "@/src/features/settings/actions";
import { SettingsClient } from "@/src/features/settings/settings-client";

export const instant = false;

export const metadata = {
  title: "System Settings | Stock Emphasis CRM",
  description: "Configure organization identity, support contacts, and system broadcast preferences.",
};

export default async function AdminSettingsPage() {
  await requireAdminSession();

  const data = await getSystemSettingsAction();

  const initialSettings = data.settings ?? {
    companyName: "Stock Emphasis CRM",
    supportEmail: "support@stockemphasis.com",
    announcementBanner: "",
    timezone: "Local System Timezone (UTC+05:30)",
  };

  return <SettingsClient initialSettings={initialSettings} />;
}
