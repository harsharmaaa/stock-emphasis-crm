export type TrialDisplayStatus = "Approved" | "Running" | "Expired" | "Pending" | "Rejected";

/**
 * Computes dynamic visual status based on date window without mutating database rows.
 */
export function computeTrialDisplayStatus(
  status: string,
  startDate: Date,
  endDate: Date
): TrialDisplayStatus {
  const upper = (status || "").toUpperCase();
  if (upper === "REJECTED") return "Rejected";
  if (upper === "PENDING") return "Pending";
  if (upper === "EXPIRED" || upper === "EXPIRE") return "Expired";

  const now = new Date();
  if (now < startDate) {
    return "Approved";
  }
  if (now >= startDate && now <= endDate) {
    return "Running";
  }
  return "Expired";
}

export const formatDateYMD = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = date.getDate();
  return `${y}-${m}-${d}`;
};

export const formatDateTime = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = date.getDate();
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
};
