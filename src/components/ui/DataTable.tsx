"use client";

import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { cn } from "@/src/lib/utils";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { Pagination } from "./Pagination";
import { Skeleton } from "./Skeleton";

export interface Column<T> {
  /** Unique key identifying the column */
  key: string;
  /** Display label for the column header */
  header: string;
  /** Custom cell renderer for the row data */
  render: (row: T) => ReactNode;
  /** Renders cell text in muted color */
  muted?: boolean;
  /** Accessor or function returning string or number to make the column sortable */
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  /** List of column specifications */
  columns: readonly Column<T>[];
  /** Array of row data */
  rows: readonly T[];
  /** Function returning a unique key string for each row */
  getRowKey: (row: T) => string;
  /** Accessible table caption (hidden visually via .sr-only-caption) */
  caption: string;
  /** Number of rows per page. Defaults to 5 */
  pageSize?: number;
  /** Loading state displaying skeleton placeholders */
  loading?: boolean;
  /** Custom CSS classes for the outer Card wrapper */
  className?: string;
  /** Custom fallback message when rows array is empty. Defaults to 'No data available' */
  emptyMessage?: string;
}

type Dir = "asc" | "desc";
interface Sort {
  key: string;
  dir: Dir;
}

/**
 * DataTable Component — Stock Emphasis CRM UI Kit
 *
 * Features:
 * - Generic row typing <T>.
 * - Client-side sorting (asc / desc / reset) with aria-sort semantics.
 * - Client-side pagination integrated with Pagination component.
 * - Skeleton placeholders during loading.
 * - Mobile responsive: automatically stacks into card layout on narrow viewports
 *   using existing .rt, .rt-sort, and data-label CSS attributes.
 * - Accessible table markup: caption, th scope="col", aria-busy.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  pageSize = 5,
  loading = false,
  className,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<Sort | null>(null);

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!sort || !col || !col.sortValue) return rows;
    const val = col.sortValue;
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y))) * mul
      );
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);
  const from = sorted.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const sortable = columns.filter((c) => c.sortValue);

  const toggle = (key: string) => {
    setPage(1);
    setSort((s) =>
      !s || s.key !== key
        ? { key, dir: "asc" }
        : s.dir === "asc"
        ? { key, dir: "desc" }
        : null
    );
  };

  const onSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    setPage(1);
    const [key, dir] = e.target.value.split(":");
    setSort(key ? { key, dir: dir as Dir } : null);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Mobile-only Sort Select Dropdown */}
      {sortable.length > 0 && (
        <div className="rt-sort">
          <label
            className="lbl"
            htmlFor="rt-sort-select"
            style={{ margin: 0, alignSelf: "center", whiteSpace: "nowrap" }}
          >
            Sort by
          </label>
          <select
            id="rt-sort-select"
            className="inp"
            value={sort ? `${sort.key}:${sort.dir}` : ""}
            onChange={onSelect}
          >
            <option value="">Default</option>
            {sortable.flatMap((c) => [
              <option key={`${c.key}a`} value={`${c.key}:asc`}>
                {c.header} (low → high)
              </option>,
              <option key={`${c.key}d`} value={`${c.key}:desc`}>
                {c.header} (high → low)
              </option>,
            ])}
          </select>
        </div>
      )}

      {/* Table Container */}
      <div style={{ overflowX: "auto" }}>
        <table className="rt" aria-busy={loading}>
          <caption className="sr-only-caption">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      c.sortValue
                        ? active
                          ? sort?.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        className="th-sort"
                        onClick={() => toggle(c.key)}
                      >
                        {c.header}
                        <Icon
                          name={
                            active
                              ? sort?.dir === "asc"
                                ? "ArrowUp"
                                : "ArrowDown"
                              : "ArrowUpDown"
                          }
                          size={12}
                        />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize }, (_, i) => (
                <tr key={i}>
                  {columns.map((c, j) => (
                    <td key={c.key} data-label={c.header}>
                      <Skeleton w={j ? 70 : 110} />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    textAlign: "center",
                    padding: "36px 16px",
                    color: "var(--muted)",
                    fontSize: 14,
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={getRowKey(row)}>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      data-label={c.header}
                      className={c.muted ? "muted" : undefined}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary and Pagination */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 14px",
          borderTop: "1px solid var(--line)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span className="muted" style={{ fontSize: 13 }} aria-live="polite">
          Showing {from}–{Math.min(current * pageSize, sorted.length)} of{" "}
          {sorted.length}
        </span>
        <Pagination page={current} pages={pages} onChange={setPage} />
      </div>
    </Card>
  );
}
