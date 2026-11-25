import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

export interface PageHeaderProps {
  /** Page or section title */
  title: ReactNode;
  /** Explanatory description */
  description?: string;
  /** Optional breadcrumb trail rendered above the header */
  breadcrumbs?: readonly BreadcrumbItem[];
  /** Action buttons rendered on the right (wraps below title on phones) */
  actions?: ReactNode;
  /** Heading semantic level: 1 (default page title), 2, or 3 */
  level?: 1 | 2 | 3;
  /** Custom CSS classes for the outer wrapper */
  className?: string;
}

/**
 * PageHeader Component — Stock Emphasis CRM UI Kit
 *
 * Page title header with optional breadcrumbs, subtitle, and action buttons.
 * Uses semantic heading tags (h1, h2, h3) and responsive layout.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  level = 1,
  className,
}: PageHeaderProps) {
  const Heading = `h${level}` as "h1" | "h2" | "h3";

  return (
    <div className={cn("pt-7 px-1 pb-0", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}

      <div className="page-header">
        <div>
          <Heading
            style={{
              fontSize: level === 1 ? 30 : level === 2 ? 24 : 20,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            {title}
          </Heading>
          {description && (
            <p
              className="muted"
              style={{
                margin: "6px 0 0",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          )}
        </div>

        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </div>
  );
}
