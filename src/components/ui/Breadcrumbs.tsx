import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/src/lib/utils";
import { Icon, type IconName } from "@/src/components/ui/Icon";

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  onSelect?: () => void;
  icon?: IconName;
}

export interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("overflow-x-auto", className)}>
      <ol className="crumbs flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const key = typeof item.label === "string" ? `${item.label}-${i}` : `crumb-${i}`;

          return (
            <li key={key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              {item.icon && <Icon name={item.icon} size={14} className="shrink-0" />}

              {isLast ? (
                <span
                  aria-current="page"
                  className="text-[var(--text)] font-semibold"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="crumb-link text-[var(--muted)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded"
                >
                  {item.label}
                </Link>
              ) : item.onSelect ? (
                <button
                  type="button"
                  onClick={item.onSelect}
                  className="crumb-link text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-[var(--muted)]">{item.label}</span>
              )}

              {!isLast && (
                <Icon
                  name="ChevronRight"
                  size={12}
                  className="text-[var(--muted)] shrink-0 opacity-60"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
