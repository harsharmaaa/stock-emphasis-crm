import { cn } from "@/src/lib/utils";
import { Icon } from "@/src/components/ui/Icon";

export interface PaginationProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Generates a sequence of pages with smart ellipsis: [1, 2, '...', 9, 10] */
function getPageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, "ellipsis", total];
  }

  if (current >= total - 2) {
    return [1, "ellipsis", total - 3, total - 2, total - 1, total];
  }

  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export function Pagination({ page, pages, onChange, className }: PaginationProps) {
  const safeTotal = Math.max(1, pages || 1);
  const safeCurrent = Math.max(1, Math.min(page || 1, safeTotal));

  const items = getPageItems(safeCurrent, safeTotal);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-1.5 select-none", className)}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={safeCurrent <= 1}
        onClick={() => onChange(safeCurrent - 1)}
        className="btn btn-sec !p-1.5 h-8 w-8 inline-flex items-center justify-center rounded-lg"
      >
        <Icon name="ChevronLeft" size={16} />
      </button>

      {items.map((item, idx) => {
        if (item === "ellipsis") {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="px-2 text-xs text-[var(--muted)] cursor-default"
              aria-hidden="true"
            >
              …
            </span>
          );
        }

        const isCurrent = safeCurrent === item;
        return (
          <button
            key={item}
            type="button"
            aria-label={`Page ${item}`}
            aria-current={isCurrent ? "page" : undefined}
            onClick={() => onChange(item)}
            className={cn(
              "btn text-xs font-semibold h-8 min-w-[32px] px-2.5 rounded-lg inline-flex items-center justify-center transition-all",
              isCurrent ? "btn-primary !shadow-sm" : "btn-sec"
            )}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        aria-label="Next page"
        disabled={safeCurrent >= safeTotal}
        onClick={() => onChange(safeCurrent + 1)}
        className="btn btn-sec !p-1.5 h-8 w-8 inline-flex items-center justify-center rounded-lg"
      >
        <Icon name="ChevronRight" size={16} />
      </button>
    </nav>
  );
}
