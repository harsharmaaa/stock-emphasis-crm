"use server";

import { requireAdminSession, handleActionError } from "@/src/lib/auth-guard";
import { logActivity } from "@/src/lib/activity-logger";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SystemSettingsValues {
  companyName: string;
  supportEmail: string;
  announcementBanner: string;
  timezone: string;
}

export async function getSystemSettingsAction(): Promise<{
  success: boolean;
  settings?: SystemSettingsValues;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const rawSettings = await prisma.systemSetting.findMany();
    const map = new Map<string, string>(rawSettings.map((s) => [s.key, s.value]));

    return {
      success: true,
      settings: {
        companyName: map.get("COMPANY_NAME") || "Stock Emphasis CRM",
        supportEmail: map.get("SUPPORT_EMAIL") || "support@stockemphasis.com",
        announcementBanner: map.get("ANNOUNCEMENT_BANNER") || "",
        timezone: map.get("SYSTEM_TIMEZONE") || "Local System Timezone (UTC+05:30)",
      },
    };
  } catch (err) {
    return handleActionError(err, "Failed to load settings. An unexpected error occurred.");
  }
}

export async function updateSystemSettingsAction(
  values: SystemSettingsValues
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const companyName = values.companyName?.trim();
    const supportEmail = values.supportEmail?.trim().toLowerCase();
    const announcementBanner = values.announcementBanner?.trim() || "";
    const timezone = values.timezone?.trim() || "Local";

    if (!companyName || companyName.length < 2) {
      return { success: false, error: "Company name must be at least 2 characters long." };
    }

    if (!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      return { success: false, error: "Please provide a valid support email address." };
    }

    // Persist each key in SystemSetting table
    await Promise.all([
      prisma.systemSetting.upsert({
        where: { key: "COMPANY_NAME" },
        update: { value: companyName },
        create: { key: "COMPANY_NAME", value: companyName, category: "ORGANIZATION" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "SUPPORT_EMAIL" },
        update: { value: supportEmail },
        create: { key: "SUPPORT_EMAIL", value: supportEmail, category: "CONTACT" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "ANNOUNCEMENT_BANNER" },
        update: { value: announcementBanner },
        create: { key: "ANNOUNCEMENT_BANNER", value: announcementBanner, category: "NOTIFICATIONS" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "SYSTEM_TIMEZONE" },
        update: { value: timezone },
        create: { key: "SYSTEM_TIMEZONE", value: timezone, category: "PREFERENCES" },
      }),
    ]);

    await logActivity({
      action: "SETTINGS_UPDATED",
      details: `Updated CRM preferences: Company='${companyName}', Support='${supportEmail}', Announcement='${announcementBanner ? "Active" : "Cleared"}'`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/manager");
    revalidatePath("/employee");

    return { success: true };
  } catch (err) {
    return handleActionError(err, "Failed to update settings. An unexpected error occurred.");
  }
}
