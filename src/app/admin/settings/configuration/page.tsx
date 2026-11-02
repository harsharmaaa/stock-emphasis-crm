import { requireAdminSession } from "@/src/lib/auth-guard";
import { ConfigurationLandingClient } from "@/src/features/settings/configuration-client";

export const instant = false;

export const metadata = {
  title: "Configuration | Stock Emphasis CRM",
  description: "Configure system company settings, product masters, payment modes, and lead rules.",
};

export default async function ConfigurationLandingPage() {
  await requireAdminSession();

  return <ConfigurationLandingClient />;
}

