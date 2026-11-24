import type { IconName } from "@/src/components/ui/Icon";

export type Tone = "ok" | "warn" | "err" | "info";
export type Trend = "up" | "down";

export interface Lead {
  id: string;
  name: string;
  product: string;
  value: string;
  status: string;
  tone: Tone;
  owner: string;
}

export interface KpiData {
  label: string;
  value: string;
  delta: string;
  icon: IconName;
  trend: Trend;
}

export interface NavItem {
  icon: IconName;
  label: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: IconName;
}

export interface UserInfo {
  name: string;
  role: string;
  email: string;
  initials: string;
}

export interface ProfileMenuItem {
  icon: IconName;
  label: string;
  onSelect?: () => void;
}
