"use server";

import { requireAdminSession } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import { logActivity } from "@/src/lib/activity-logger";
import { revalidatePath } from "next/cache";
import type { CompanyDetailsValues } from "./types";

/**
 * Fetch company details and policy stored in the SystemSetting table.
 * Restricted strictly to Admins.
 */
export async function getCompanyDetailsAction(): Promise<{
  success: boolean;
  company?: CompanyDetailsValues;
  error?: string;
}> {
  try {
    await requireAdminSession({ redirect: false });

    const rawSettings = await prisma.systemSetting.findMany({
      where: {
        category: { in: ["ORGANIZATION", "COMPANY_DETAILS", "COMPANY_POLICY"] },
      },
    });

    const map = new Map<string, string>(rawSettings.map((s) => [s.key, s.value]));

    // Check COMPANY_NAME fallback from ORGANIZATION category
    const companyName =
      map.get("COMPANY_DETAILS_NAME") || map.get("COMPANY_NAME") || "";

    return {
      success: true,
      company: {
        name: companyName,
        website: map.get("COMPANY_WEBSITE") || "",
        state: map.get("COMPANY_STATE") || "",
        city: map.get("COMPANY_CITY") || "",
        address: map.get("COMPANY_ADDRESS") || "",
        monthStartDay: map.get("COMPANY_MONTH_START_DAY") || "01",
        monthEndDay: map.get("COMPANY_MONTH_END_DAY") || "Last Day Of Month",
        policy: map.get("COMPANY_POLICY") || "",
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load company details.";
    return { success: false, error: message };
  }
}

/**
 * Update and persist company details and policy.
 */
export async function updateCompanyDetailsAction(
  values: CompanyDetailsValues
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminSession({ redirect: false });

    const trimmedName = (values.name || "").trim();
    if (!trimmedName) {
      return { success: false, error: "Company Name is required." };
    }

    const trimmedWebsite = (values.website || "").trim();
    if (trimmedWebsite) {
      // Validate website URL format (allow http://, https://, or standard domain format like www.example.com or example.com)
      const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/i;
      if (!urlPattern.test(trimmedWebsite)) {
        return { success: false, error: "Please provide a valid website URL (e.g. www.stockemphasis.com or https://stockemphasis.com)." };
      }
    }

    const trimmedState = (values.state || "").trim();
    const trimmedCity = (values.city || "").trim();
    const trimmedAddress = (values.address || "").trim();
    const monthStartDay = (values.monthStartDay || "01").trim();
    const monthEndDay = (values.monthEndDay || "Last Day Of Month").trim();
    const policy = (values.policy || "").trim();

    // Persist settings in SystemSetting table using upsert
    await prisma.$transaction([
      // Keep COMPANY_NAME in sync for the whole system
      prisma.systemSetting.upsert({
        where: { key: "COMPANY_NAME" },
        update: { value: trimmedName },
        create: { key: "COMPANY_NAME", value: trimmedName, category: "ORGANIZATION" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "COMPANY_DETAILS_NAME" },
        update: { value: trimmedName },
        create: { key: "COMPANY_DETAILS_NAME", value: trimmedName, category: "COMPANY_DETAILS" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "COMPANY_WEBSITE" },
        update: { value: trimmedWebsite },
        create: { key: "COMPANY_WEBSITE", value: trimmedWebsite, category: "COMPANY_DETAILS" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "COMPANY_STATE" },
        update: { value: trimmedState },
        create: { key: "COMPANY_STATE", value: trimmedState, category: "COMPANY_DETAILS" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "COMPANY_CITY" },
        update: { value: trimmedCity },
        create: { key: "COMPANY_CITY", value: trimmedCity, category: "COMPANY_DETAILS" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "COMPANY_ADDRESS" },
        update: { value: trimmedAddress },
        create: { key: "COMPANY_ADDRESS", value: trimmedAddress, category: "COMPANY_DETAILS" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "COMPANY_MONTH_START_DAY" },
        update: { value: monthStartDay },
        create: { key: "COMPANY_MONTH_START_DAY", value: monthStartDay, category: "COMPANY_DETAILS" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "COMPANY_MONTH_END_DAY" },
        update: { value: monthEndDay },
        create: { key: "COMPANY_MONTH_END_DAY", value: monthEndDay, category: "COMPANY_DETAILS" },
      }),
      prisma.systemSetting.upsert({
        where: { key: "COMPANY_POLICY" },
        update: { value: policy },
        create: { key: "COMPANY_POLICY", value: policy, category: "COMPANY_POLICY" },
      }),
    ]);

    await logActivity({
      action: "UPDATE_COMPANY_DETAILS",
      details: `Updated company details for "${trimmedName}" (Website: ${trimmedWebsite || "N/A"}, State: ${trimmedState || "N/A"})`,
      actorId: admin.id,
    });

    revalidatePath("/admin/settings/company");
    revalidatePath("/admin/settings/configuration");
    revalidatePath("/admin/settings");
    revalidatePath("/admin");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save company details.";
    return { success: false, error: message };
  }
}

