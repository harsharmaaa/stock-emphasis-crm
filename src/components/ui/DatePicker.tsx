"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "@/src/lib/utils";
import { useOutsideClick } from "@/src/hooks/useOutsideClick";
import { Icon } from "./Icon";

export interface DatePickerProps {
  /** Unique ID for the trigger button and label association */
  id?: string;
  /** Form submission field name (renders a hidden input for native forms and server actions) */
  name?: string;
  /** Controlled ISO date value in `YYYY-MM-DD` format, or '' for empty */
  value?: string;
  /** Uncontrolled default ISO date value in `YYYY-MM-DD` format */
  defaultValue?: string;
  /** Callback fired when date changes, receiving `YYYY-MM-DD` or '' */
  onChange?: (date: string) => void;
  /** Placeholder text when no date is selected. Defaults to 'Select date' */
  placeholder?: string;
  /**
   * Minimum selectable ISO date `YYYY-MM-DD`.
   * Earlier dates are disabled and skipped in keyboard navigation.
   */
  min?: string;
  /**
   * Maximum selectable ISO date `YYYY-MM-DD`.
   * Later dates are disabled and skipped in keyboard navigation.
   */
  max?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Whether to show the 'Clear' quick-action button. Defaults to true */
  clearable?: boolean;
  /**
   * Render calendar inline within document flow instead of floating popover.
   * Useful inside modals/drawers to eliminate clipping. Defaults to false.
   */
  inline?: boolean;
  /** Custom class names for the outer wrapper container */
  className?: string;
  /** Custom class names for the trigger button */
  triggerClassName?: string;
  /** Optional accessible label if not associated with an external <Field> label */
  "aria-label"?: string;
  /** Optional accessible label prop alias */
  ariaLabel?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Formats year, month (0-indexed), and day into a strict YYYY-MM-DD string
 * without any UTC or timezone conversions.
 */
export const formatIsoDate = (y: number, m: number, d: number): string =>
  `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * Parses a YYYY-MM-DD string into a local Date instance without any UTC conversion.
 * Returns null if the string is empty or invalid.
 */
export const parseIsoDate = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  // Validate date integrity (e.g. roll-overs like Feb 31)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

/**
 * Formats a Date instance for Indian English display: `15 Jan 2025`
 */
export const formatDisplayDate = (d: Date): string =>
  d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * Checks if a specific day is within [min, max] boundaries.
 */
const isDateEnabled = (
  year: number,
  month: number,
  day: number,
  minD: Date | null,
  maxD: Date | null
): boolean => {
  const current = new Date(year, month, day);
  if (minD && current < minD) return false;
  if (maxD && current > maxD) return false;
  return true;
};

/**
 * Returns the first enabled day (1..daysInMonth) in a given month.
 */
const getFirstEnabledDay = (
  year: number,
  month: number,
  minD: Date | null,
  maxD: Date | null
): number | null => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (isDateEnabled(year, month, d, minD, maxD)) return d;
  }
  return null;
};

/**
 * Returns the last enabled day (1..daysInMonth) in a given month.
 */
const getLastEnabledDay = (
  year: number,
  month: number,
  minD: Date | null,
  maxD: Date | null
): number | null => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = daysInMonth; d >= 1; d--) {
    if (isDateEnabled(year, month, d, minD, maxD)) return d;
  }
  return null;
};

/**
 * Returns the nearest enabled day in a month, searching outward from a preferred day.
 */
const getNearestEnabledDay = (
  year: number,
  month: number,
  preferred: number,
  minD: Date | null,
  maxD: Date | null
): number | null => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const clamped = Math.max(1, Math.min(daysInMonth, preferred));
  if (isDateEnabled(year, month, clamped, minD, maxD)) return clamped;

  for (let offset = 1; offset <= daysInMonth; offset++) {
    const prev = clamped - offset;
    const next = clamped + offset;
    if (prev >= 1 && isDateEnabled(year, month, prev, minD, maxD)) return prev;
    if (next <= daysInMonth && isDateEnabled(year, month, next, minD, maxD)) return next;
  }
  return null;
};

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * DatePicker Component — Stock Emphasis CRM UI Kit
 *
 * Features:
 * - WAI-ARIA role="dialog", role="grid", and roving tabIndex semantics.
 * - Strict YYYY-MM-DD string format with zero UTC conversions or timezone shifts.
 * - Controlled and uncontrolled usage modes.
 * - Bounds-aware keyboard navigation: Arrows, Home, End, PageUp, PageDown strictly
 *   skip disabled dates and clamp to valid destination month days.
 * - Native hidden input integration for HTML forms and Next.js Server Actions.
 * - Floating and inline flow calendar modes (inline avoids modal/drawer clipping).
 * - Localized Escape handling with e.stopPropagation() prevents dismissing parent Modals.
 * - Indian English date display (`en-IN`) with soft blue accents (`var(--brand)`).
 * - Outside-click dismissal and automatic trigger focus restoration.
 */
export function DatePicker({
  id: explicitId,
  name,
  value: controlledValue,
  defaultValue = "",
  onChange,
  placeholder = "Select date",
  min,
  max,
  disabled = false,
  readOnly = false,
  clearable = true,
  inline = false,
  className,
  triggerClassName,
  "aria-label": ariaLabelProp,
  ariaLabel: ariaLabelAlias,
}: DatePickerProps) {
  const generatedId = useId();
  const id = explicitId || `datepicker-${generatedId}`;
  const dialogId = `${id}-dialog`;
  const accessibleLabel = ariaLabelProp || ariaLabelAlias;

  // Controlled vs Uncontrolled value management
  const [uncontrolledValue, setUncontrolledValue] = useState<string>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : uncontrolledValue;

  const updateValue = useCallback(
    (next: string) => {
      if (readOnly || disabled) return;
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onChange?.(next);
    },
    [isControlled, readOnly, disabled, onChange]
  );

  const selectedDate = useMemo(() => parseIsoDate(currentValue), [currentValue]);
  const minDate = useMemo(() => parseIsoDate(min), [min]);
  const maxDate = useMemo(() => parseIsoDate(max), [max]);

  // Open / Close state for calendar popover
  const [open, setOpen] = useState(false);
  const isOpen = open && !disabled && !readOnly;

  // Calendar month view (initialized to selected date or current month)
  const [viewDate, setViewDate] = useState<Date>(() => {
    const initial = selectedDate ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  // Synchronize viewDate when selected date changes
  const [prevCurrentValue, setPrevCurrentValue] = useState(currentValue);
  if (currentValue !== prevCurrentValue) {
    setPrevCurrentValue(currentValue);
    if (selectedDate) {
      setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const leadBlanks = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const now = new Date();
  const todayIso = formatIsoDate(now.getFullYear(), now.getMonth(), now.getDate());

  // Roving focus day inside current month grid (1..daysInMonth)
  const [focusedDay, setFocusedDay] = useState<number>(() => {
    if (
      selectedDate &&
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      isDateEnabled(viewYear, viewMonth, selectedDate.getDate(), minDate, maxDate)
    ) {
      return selectedDate.getDate();
    }
    const nearest = getNearestEnabledDay(viewYear, viewMonth, 1, minDate, maxDate);
    return nearest ?? 1;
  });

  // Outside click dismisses popover
  useOutsideClick(wrapperRef, () => setOpen(false), isOpen);

  // Month navigation boundary checks
  const canPrevMonth = !minDate || new Date(viewYear, viewMonth, 0) >= minDate;
  const canNextMonth = !maxDate || new Date(viewYear, viewMonth + 1, 1) <= maxDate;

  // Month shift helper with day clamping and bounds resolution
  const navigateMonth = (delta: number) => {
    const targetYear =
      delta > 0 && viewMonth === 11
        ? viewYear + 1
        : delta < 0 && viewMonth === 0
        ? viewYear - 1
        : viewYear;
    const targetMonth = (viewMonth + delta + 12) % 12;

    // Verify boundary
    if (delta < 0 && !canPrevMonth) return;
    if (delta > 0 && !canNextMonth) return;

    const destDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const clampedDay = Math.min(focusedDay, destDaysInMonth);
    const targetDay =
      getNearestEnabledDay(targetYear, targetMonth, clampedDay, minDate, maxDate) ??
      1;

    setViewDate(new Date(targetYear, targetMonth, 1));
    setFocusedDay(targetDay);
  };

  // Day selection handler
  const handleSelectDay = (day: number) => {
    if (readOnly || disabled) return;
    if (!isDateEnabled(viewYear, viewMonth, day, minDate, maxDate)) return;

    const iso = formatIsoDate(viewYear, viewMonth, day);
    updateValue(iso);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Focus day element when focusedDay changes while open
  useEffect(() => {
    if (isOpen) {
      const timer = requestAnimationFrame(() => {
        // Query the focused enabled day, or fallback to any enabled day
        const el =
          gridRef.current?.querySelector<HTMLButtonElement>(
            `[data-day="${focusedDay}"]:not([disabled])`
          ) ??
          gridRef.current?.querySelector<HTMLButtonElement>(
            ".cal-day:not([disabled])"
          );
        el?.focus();
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen, focusedDay, viewYear, viewMonth]);

  // Initial focus on open: prioritize selected date, then today, then nearest enabled date
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      let initialDay = 1;
      if (
        selectedDate &&
        selectedDate.getFullYear() === viewYear &&
        selectedDate.getMonth() === viewMonth &&
        isDateEnabled(viewYear, viewMonth, selectedDate.getDate(), minDate, maxDate)
      ) {
        initialDay = selectedDate.getDate();
      } else if (
        now.getFullYear() === viewYear &&
        now.getMonth() === viewMonth &&
        isDateEnabled(viewYear, viewMonth, now.getDate(), minDate, maxDate)
      ) {
        initialDay = now.getDate();
      } else {
        const nearest = getNearestEnabledDay(viewYear, viewMonth, 1, minDate, maxDate);
        if (nearest !== null) initialDay = nearest;
      }
      setFocusedDay(initialDay);
    }
  }

  // Bounds-aware date navigation by day/week offset
  const moveByOffset = (delta: number) => {
    const current = new Date(viewYear, viewMonth, focusedDay);
    const target = new Date(viewYear, viewMonth, focusedDay + delta);

    // Boundary stops
    if (minDate && target < minDate) {
      // Do not navigate prior to minDate
      return;
    }
    if (maxDate && target > maxDate) {
      // Do not navigate past maxDate
      return;
    }

    const targetYear = target.getFullYear();
    const targetMonth = target.getMonth();
    const targetDay = target.getDate();

    if (targetYear !== viewYear || targetMonth !== viewMonth) {
      setViewDate(new Date(targetYear, targetMonth, 1));
    }
    setFocusedDay(targetDay);
  };

  // Keyboard navigation inside calendar grid
  const handleGridKeyDown = (e: KeyboardEvent<HTMLButtonElement>, day: number) => {
    let handled = true;

    if (e.key === "ArrowRight") {
      moveByOffset(1);
    } else if (e.key === "ArrowLeft") {
      moveByOffset(-1);
    } else if (e.key === "ArrowDown") {
      moveByOffset(7);
    } else if (e.key === "ArrowUp") {
      moveByOffset(-7);
    } else if (e.key === "Home") {
      const firstEnabled = getFirstEnabledDay(viewYear, viewMonth, minDate, maxDate);
      if (firstEnabled !== null) {
        setFocusedDay(firstEnabled);
      }
    } else if (e.key === "End") {
      const lastEnabled = getLastEnabledDay(viewYear, viewMonth, minDate, maxDate);
      if (lastEnabled !== null) {
        setFocusedDay(lastEnabled);
      }
    } else if (e.key === "PageUp") {
      navigateMonth(-1);
    } else if (e.key === "PageDown") {
      navigateMonth(1);
    } else if (e.key === "Enter" || e.key === " ") {
      handleSelectDay(day);
    } else {
      handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Localized Escape handler to avoid closing parent Modal
  const handleWrapperKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const monthHeading = viewDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const cells: (number | null)[] = [
    ...Array(leadBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      ref={wrapperRef}
      className={cn("relative inline-block w-full", className)}
      onKeyDown={handleWrapperKeyDown}
    >
      {/* Native hidden input for form submissions */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue}
          disabled={disabled}
        />
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? dialogId : undefined}
        aria-label={accessibleLabel}
        className={cn("inp inp-btn w-full", triggerClassName)}
        onClick={() => {
          if (!disabled && !readOnly) {
            setOpen((prev) => !prev);
          }
        }}
      >
        <span className={cn(!selectedDate && "is-placeholder")}>
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </span>
        <Icon name="Calendar" size={16} />
      </button>

      {/* Calendar Dialog */}
      {isOpen && (
        <div
          id={dialogId}
          role="dialog"
          aria-label="Choose date"
          aria-modal="false"
          className={cn(
            "glass glass-pop datepicker",
            inline ? "inline" : "floating"
          )}
        >
          {/* Month / Year Header Navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <button
              type="button"
              disabled={!canPrevMonth}
              aria-label="Previous month"
              className="btn btn-ghost"
              style={{ padding: 6 }}
              onClick={() => navigateMonth(-1)}
            >
              <Icon name="ChevronLeft" size={16} />
            </button>

            <b aria-live="polite" style={{ fontSize: 14 }}>
              {monthHeading}
            </b>

            <button
              type="button"
              disabled={!canNextMonth}
              aria-label="Next month"
              className="btn btn-ghost"
              style={{ padding: 6 }}
              onClick={() => navigateMonth(1)}
            >
              <Icon name="ChevronRight" size={16} />
            </button>
          </div>

          {/* Days of Week & Calendar Grid */}
          <div
            ref={gridRef}
            role="grid"
            aria-label={monthHeading}
            className="cal-grid"
          >
            {DOW.map((d) => (
              <div key={d} className="cal-dow" aria-hidden="true">
                {d}
              </div>
            ))}

            {cells.map((d, i) => {
              if (d === null) {
                return <span key={`blank-${i}`} aria-hidden="true" />;
              }

              const iso = formatIsoDate(viewYear, viewMonth, d);
              const isSelected = iso === currentValue;
              const isToday = iso === todayIso;

              const isEnabled = isDateEnabled(viewYear, viewMonth, d, minDate, maxDate);
              const isOutOfBounds = !isEnabled;
              const isFocused = focusedDay === d && isEnabled;

              return (
                <button
                  key={d}
                  type="button"
                  data-day={d}
                  role="gridcell"
                  tabIndex={isFocused ? 0 : -1}
                  disabled={isOutOfBounds}
                  aria-disabled={isOutOfBounds ? "true" : undefined}
                  aria-selected={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={formatDisplayDate(new Date(viewYear, viewMonth, d))}
                  className={cn(
                    "cal-day",
                    isToday && "today",
                    isSelected && "sel",
                    isOutOfBounds && "opacity-30 cursor-not-allowed pointer-events-none"
                  )}
                  onClick={() => handleSelectDay(d)}
                  onKeyDown={(e) => handleGridKeyDown(e, d)}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: "4px 8px" }}
              onClick={() => {
                const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (
                  (minDate && todayDate < minDate) ||
                  (maxDate && todayDate > maxDate)
                ) {
                  return;
                }
                setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
                updateValue(todayIso);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              Today
            </button>

            {clearable && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: "4px 8px" }}
                onClick={() => {
                  updateValue("");
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
