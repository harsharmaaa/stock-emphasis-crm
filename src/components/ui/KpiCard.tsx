import type { KpiData } from "@/src/types/ui-kit";
import { cn } from "@/src/lib/utils";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { Icon } from "./Icon";

export type KpiCardProps = KpiData & {
  /** Optional comparison text beneath the trend badge. Defaults to 'vs last month' */
  comparison?: string;
  /** Custom CSS classes for the outer Card wrapper */
  className?: string;
};

/**
 * KpiCard Component — Stock Emphasis CRM UI Kit
 *
 * Displays a single key performance indicator metric with trend badge,
 * icon badge, bold value, and comparison context.
 */
export function KpiCard({
  label,
  value,
  delta,
  icon,
  trend,
  comparison = "vs last month",
  className,
}: KpiCardProps) {
  const isUp = trend === "up";

  return (
    <Card className={cn("p-[18px]", className)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          className="muted"
          style={{ fontSize: 13, fontWeight: 500 }}
        >
          {label}
        </span>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: "var(--grad)",
            color: "var(--on-brand)",
            display: "grid",
            placeItems: "center",
          }}
          aria-hidden="true"
        >
          <Icon name={icon} size={16} />
        </span>
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          margin: "10px 0 6px",
          letterSpacing: "-0.02em",
          color: "var(--text)",
        }}
      >
        {value}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Badge tone={isUp ? "ok" : "err"}>
          <Icon
            name={isUp ? "ArrowUpRight" : "ArrowDownRight"}
            size={12}
          />
          {delta}
        </Badge>
        <span className="muted" style={{ fontSize: 12 }}>
          {comparison}
        </span>
      </div>
    </Card>
  );
}
