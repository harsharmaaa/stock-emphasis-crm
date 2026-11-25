import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";
import { Button } from "./Button";
import { Card } from "./Card";
import { Icon, type IconName } from "./Icon";

export interface EmptyStateProps {
  /** Decorative icon displayed inside the header avatar. Defaults to 'Inbox' */
  icon?: IconName;
  /** Primary title of the empty state */
  title: string;
  /** Explanatory description */
  description: string;
  /** Optional action button text */
  actionLabel?: string;
  /** Optional icon for the action button. Defaults to 'Plus' */
  actionIcon?: IconName;
  /** Callback fired when action button is clicked */
  onAction?: () => void;
  /** Optional custom child elements (e.g. secondary links or search inputs) */
  children?: ReactNode;
  /** Custom CSS classes for the outer Card */
  className?: string;
}

/**
 * EmptyState Component — Stock Emphasis CRM UI Kit
 *
 * Glassmorphic empty state presentation with centered icon gradient avatar,
 * title, description, and optional primary action button.
 */
export function EmptyState({
  icon = "Inbox",
  title,
  description,
  actionLabel,
  actionIcon = "Plus",
  onAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("p-9 text-center", className)}>
      <div
        style={{
          width: 64,
          height: 64,
          margin: "0 auto 14px",
          borderRadius: 20,
          background: "var(--grad)",
          color: "var(--on-brand)",
          display: "grid",
          placeItems: "center",
          boxShadow: "var(--shadow-icon)",
        }}
        aria-hidden="true"
      >
        <Icon name={icon} size={28} />
      </div>
      <h3
        style={{
          margin: "0 0 6px",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--text)",
        }}
      >
        {title}
      </h3>
      <p
        className="muted"
        style={{
          margin: "0 auto 18px",
          maxWidth: 320,
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {/* Render action button strictly when both label and onAction callback exist */}
      {actionLabel && onAction && (
        <div style={{ display: "inline-block" }}>
          <Button variant="grad" icon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}

      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </Card>
  );
}
