import type { CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Check,
  ChevronUp,
  Copy,
  Info,
  MoreHorizontal,
  Pencil,
  TriangleAlert,
  AlarmClock,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Download,
  IndianRupee,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

/** Only icons listed here are bundled (tree-shaking friendly). Add new ones here. */
const ICONS = {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Check,
  ChevronUp,
  Copy,
  Info,
  MoreHorizontal,
  Pencil,
  TriangleAlert,
  AlarmClock,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Download,
  IndianRupee,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Users,
  X,
} as const;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/** Decorative Lucide icon (hidden from assistive tech). Pair with a text label or aria-label on the parent. */
export function Icon({ name, size = 18, className, style }: IconProps) {
  const Cmp = ICONS[name];
  return <Cmp size={size} className={className} style={style} aria-hidden="true" />;
}
