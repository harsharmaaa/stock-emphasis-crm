"use client";

import {
  useRef,
  useState,
  useId,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { cn } from "@/src/lib/utils";
import { Icon, type IconName } from "@/src/components/ui/Icon";

export interface TabObject<T extends string = string> {
  id: T;
  label: ReactNode;
  icon?: IconName;
  disabled?: boolean;
  /**
   * Content rendered inside the corresponding tabpanel (used in Full Tabs Mode).
   * Note: In Full Tabs Mode, if an item's `panel` is undefined, an empty but valid `<div role="tabpanel">`
   * is rendered as a fallback to guarantee that every `<button role="tab">` has a corresponding matching
   * panel element with reciprocal ARIA associations, preventing dangling aria-controls references.
   */
  panel?: ReactNode;
}

export type TabItemDef<T extends string = string> = T | TabObject<T>;

export interface TabsProps<T extends string = string> {
  items: readonly TabItemDef<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  label?: string;
  id?: string;
  /**
   * Mode:
   * - "tabs": Full tabs mode with WAI-ARIA tablist & tabpanel semantics, reciprocal IDs, and arrow navigation.
   * - "filter": Segmented filter mode with role="group" and native buttons using aria-pressed.
   * Defaults to "tabs" if any item defines a `panel`, otherwise "filter".
   */
  mode?: "tabs" | "filter";
  /** In Full Tabs Mode, applies directly to the tablist for backward compatibility. In Filter Mode, applies to the filter group. */
  className?: string;
  /** Additional styling applied specifically to the tablist element in Full Tabs Mode. */
  tabListClassName?: string;
  panelClassName?: string;
}

/**
 * Universal Tabs & Segmented Filter Component.
 * Supports:
 * 1. Full Tabs Mode: WAI-ARIA tablist & tabpanel semantics, reciprocal IDs, panel rendering, and arrow key navigation.
 *    - Missing panel behavior: In Full Tabs Mode, if an item's `panel` is undefined, an empty but valid
 *      tabpanel element is rendered to prevent dangling `aria-controls` references and guarantee 100% WAI-ARIA compliance.
 * 2. Segmented Filter Mode: Clean button-group semantics (role="group" + aria-pressed) without dangling aria-controls.
 * Safely handles disabled initial tabs, all-tabs-disabled edge case, and invalid values.
 */
export function Tabs<T extends string = string>({
  items,
  value,
  defaultValue,
  onChange,
  label = "Tabs",
  id: explicitId,
  mode,
  className,
  tabListClassName,
  panelClassName,
}: TabsProps<T>) {
  const generatedId = useId();
  const baseId = explicitId || generatedId;

  // 1. Normalize items to structured TabObject
  const normalizedItems: TabObject<T>[] = items.map((it) =>
    typeof it === "string" ? { id: it as T, label: it } : (it as TabObject<T>)
  );

  // 2. Identify enabled tabs
  const enabledItems = normalizedItems.filter((it) => !it.disabled);
  const firstEnabledItem = enabledItems[0];

  const isEnabledValue = (val: unknown): val is T =>
    typeof val === "string" && enabledItems.some((it) => it.id === val);

  // 3. Determine mode: full tabs vs segmented filter
  const hasAnyPanels = normalizedItems.some((it) => it.panel !== undefined);
  const isTabsMode = mode === "tabs" || (mode === undefined && hasAnyPanels);

  // 4. State management: declare internalValue and currentValue exactly once
  const [internalValue, setInternalValue] = useState<T | undefined>(() => {
    if (defaultValue !== undefined && isEnabledValue(defaultValue)) {
      return defaultValue;
    }
    return firstEnabledItem?.id;
  });

  const isControlled = value !== undefined;
  const currentValue: T | undefined = isControlled
    ? isEnabledValue(value)
      ? value
      : firstEnabledItem?.id
    : internalValue !== undefined && isEnabledValue(internalValue)
      ? internalValue
      : firstEnabledItem?.id;

  // 5. Select handler
  const handleSelect = (id: T, disabled?: boolean) => {
    if (disabled) return;
    if (!isControlled) {
      setInternalValue(id);
    }
    onChange?.(id);
  };

  // 6. Roving tabIndex and keyboard navigation (Full Tabs Mode only)
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const enabledIndices = normalizedItems
    .map((it, idx) => (it.disabled ? -1 : idx))
    .filter((idx) => idx !== -1);

  const selectedIndex = normalizedItems.findIndex(
    (it) => currentValue !== undefined && it.id === currentValue && !it.disabled
  );

  const activeFocusableIndex =
    selectedIndex !== -1 ? selectedIndex : (enabledIndices[0] ?? -1);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (!isTabsMode || enabledIndices.length === 0) return;

    let targetIndex = -1;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const currentPos = enabledIndices.indexOf(currentIndex);
      const nextPos =
        currentPos === -1 ? 0 : (currentPos + 1) % enabledIndices.length;
      targetIndex = enabledIndices[nextPos]!;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const currentPos = enabledIndices.indexOf(currentIndex);
      const prevPos =
        currentPos === -1
          ? enabledIndices.length - 1
          : (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
      targetIndex = enabledIndices[prevPos]!;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetIndex = enabledIndices[0]!;
    } else if (e.key === "End") {
      e.preventDefault();
      targetIndex = enabledIndices[enabledIndices.length - 1]!;
    }

    if (targetIndex !== -1 && targetIndex !== currentIndex) {
      const targetItem = normalizedItems[targetIndex];
      if (targetItem && !targetItem.disabled) {
        handleSelect(targetItem.id, false);
        refs.current[targetIndex]?.focus();
      }
    }
  };

  // 7. Render Full Tabs Mode
  if (isTabsMode) {
    return (
      <div className="tabs-container">
        <div
          role="tablist"
          aria-label={label}
          aria-orientation="horizontal"
          className={cn(
            "glass tabs-scroll inline-flex p-1 gap-0.5 rounded-[14px]",
            className,
            tabListClassName
          )}
        >
          {normalizedItems.map((item, i) => {
            const isSelected = currentValue !== undefined && item.id === currentValue;
            const tabId = `${baseId}-tab-${item.id}`;
            const panelId = `${baseId}-panel-${item.id}`;
            const isFocusable = i === activeFocusableIndex;

            return (
              <button
                key={item.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={panelId}
                aria-disabled={item.disabled || undefined}
                disabled={item.disabled}
                tabIndex={isFocusable ? 0 : -1}
                className={cn(
                  "tab inline-flex items-center gap-1.5",
                  isSelected && "on",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleSelect(item.id, item.disabled)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                {item.icon && <Icon name={item.icon} size={14} />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="tab-panels-wrapper mt-3">
          {normalizedItems.map((item) => {
            const isSelected = currentValue !== undefined && item.id === currentValue;
            const tabId = `${baseId}-tab-${item.id}`;
            const panelId = `${baseId}-panel-${item.id}`;

            return (
              <div
                key={item.id}
                role="tabpanel"
                id={panelId}
                aria-labelledby={tabId}
                tabIndex={0}
                hidden={!isSelected}
                className={cn(
                  "tab-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-xl",
                  !isSelected && "hidden",
                  panelClassName
                )}
              >
                {item.panel ?? null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 8. Render Segmented Filter Mode
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "glass tabs-scroll inline-flex p-1 gap-0.5 rounded-[14px]",
        className
      )}
    >
      {normalizedItems.map((item) => {
        const isSelected = currentValue !== undefined && item.id === currentValue;

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isSelected}
            aria-disabled={item.disabled || undefined}
            disabled={item.disabled}
            className={cn(
              "tab inline-flex items-center gap-1.5",
              isSelected && "on",
              item.disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleSelect(item.id, item.disabled)}
          >
            {item.icon && <Icon name={item.icon} size={14} />}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
