/**
 * Multiple Employee Profile Priority hierarchy.
 * When an employee has multiple applicable Employee Profile rules, this exact priority order wins:
 * 1. FM
 * 2. AFM
 * 3. ARM
 * 4. STL
 * 5. TL
 * 6. SBA
 * 7. BA
 * 8. BAT
 * 9. SUPPORT
 */
export const EMPLOYEE_PROFILE_PRIORITY: readonly string[] = [
  "FM",
  "AFM",
  "ARM",
  "STL",
  "TL",
  "SBA",
  "BA",
  "BAT",
  "SUPPORT",
] as const;

/**
 * Returns numeric priority rank (0 is highest priority).
 * Unlisted profiles are assigned 9999 (safely lower priority than listed profiles).
 */
export function getProfilePriorityRank(profileName: string): number {
  if (!profileName) return 9999;
  const normalized = profileName.trim().toUpperCase();
  const index = EMPLOYEE_PROFILE_PRIORITY.findIndex(
    (p) => p.toUpperCase() === normalized
  );
  return index !== -1 ? index : 9999;
}

