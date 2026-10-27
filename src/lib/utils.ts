export { cn } from "cn";

/**
 * Normalizes phone numbers to prevent duplicate bypasses via formatting differences.
 * Strips non-digits, and removes leading country code (+91/91) or leading 0 for 10-digit formats.
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\D/g, "");

  // If 11 digits starting with 0 (e.g. 09876543210), strip the leading 0
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return cleaned.slice(1);
  }

  // If 12 digits starting with 91 (e.g. 919876543210 or +91), strip the 91
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned.slice(2);
  }

  return cleaned;
}

/**
 * Maps incoming status filter query parameters to stored database status values.
 */
export function normalizeStatusFilter(param?: string): string | undefined {
  if (!param || param === "ALL" || param.toLowerCase() === "all") return undefined;
  const upper = param.toUpperCase();
  if (upper === "FOLLOWUPS" || upper === "FOLLOW_UP" || upper === "FOLLOW-UPS") return "FOLLOW_UP";
  if (upper === "TRIALS" || upper === "TRIAL") return "TRIAL";
  if (upper === "CLIENTS" || upper === "CLIENT") return "CLIENT";
  if (upper === "UNFOLLOWED") return "UNFOLLOWED";
  if (upper === "UNREAD") return "UNREAD";
  if (upper === "READ") return "READ";
  if (upper === "DISPOSED") return "DISPOSED";
  return upper;
}

/**
 * Confirmed Lead Response options (12 exact options in order):
 * Callback, NPC, Do Not Trade, Not Reachable, Switch Off, Not Interested,
 * Call Disconnect, Language Issue, Busy, FT, Interested, Paid.
 */
export const LEAD_RESPONSE_OPTIONS = [
  "Callback",
  "NPC",
  "Do Not Trade",
  "Not Reachable",
  "Switch Off",
  "Not Interested",
  "Call Disconnect",
  "Language Issue",
  "Busy",
  "FT",
  "Interested",
  "Paid",
] as const;

export type LeadResponseOption = (typeof LEAD_RESPONSE_OPTIONS)[number];

/**
 * Confirmed Lead Source options (11 exact options in order):
 * Premium Lead, HNI Lead, Weblead, Fresh Lead, SEO, PMS, Emphasis,
 * Live, Callback, Interested, Web MT.
 */
export const LEAD_SOURCE_OPTIONS = [
  "Premium Lead",
  "HNI Lead",
  "Weblead",
  "Fresh Lead",
  "SEO",
  "PMS",
  "Emphasis",
  "Live",
  "Callback",
  "Interested",
  "Web MT",
] as const;

export type LeadSourceOption = (typeof LEAD_SOURCE_OPTIONS)[number];

/**
 * Confirmed Profile options (6 exact options in order):
 * Trader, Businessman, Student, Investor, Dabba Trader, Fresher.
 */
export const LEAD_PROFILE_OPTIONS = [
  "Trader",
  "Businessman",
  "Student",
  "Investor",
  "Dabba Trader",
  "Fresher",
] as const;

export type LeadProfileOption = (typeof LEAD_PROFILE_OPTIONS)[number];

/**
 * Confirmed Experience options (5 exact options in order):
 * Not Started, Fresher, 1 Year, 5 Year, 10 Year.
 */
export const LEAD_EXPERIENCE_OPTIONS = [
  "Not Started",
  "Fresher",
  "1 Year",
  "5 Year",
  "10 Year",
] as const;

export type LeadExperienceOption = (typeof LEAD_EXPERIENCE_OPTIONS)[number];
