"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/src/lib/utils";
import { useOutsideClick } from "@/src/hooks/useOutsideClick";
import { Icon, type IconName } from "./Icon";

export interface DropdownItem {
  label: string;
  icon?: IconName;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface DropdownSeparator {
  type: "separator";
}

export type DropdownMenuItem = DropdownItem | DropdownSeparator;

function isSeparator(item: DropdownMenuItem): item is DropdownSeparator {
  return "type" in item && item.type === "separator";
}

export interface DropdownMenuProps {
  /** Accessible name for the trigger button (used as aria-label). */
  label: string;
  /** Menu items or separators to display. */
  items: readonly DropdownMenuItem[];
  /** Optional visible trigger text displayed alongside the default icon. */
  triggerText?: string;
  /**
   * Optional custom trigger content rendered inside the accessible trigger button.
   * Note: This represents trigger content (labels, badges, avatars), not an independent interactive button.
   */
  trigger?: ReactNode;
  /** Popover panel alignment relative to the trigger. Defaults to 'left'. */
  align?: "left" | "right";
  /**
   * Responsive anchoring behavior:
   * - 'self': anchored directly to the trigger button.
   * - 'parent': on mobile, panel spans full width of nearest positioned ancestor.
   */
  anchor?: "self" | "parent";
  /** Custom CSS classes for the trigger button. */
  triggerClassName?: string;
  /** Custom CSS classes for the menu popover panel. */
  className?: string;
  /** Controlled open state. */
  open?: boolean;
  /** Callback fired when the open state changes. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * DropdownMenu Component — Stock Emphasis CRM UI Kit
 *
 * Features:
 * - WAI-ARIA role="menu", role="menuitem", role="separator" semantics.
 * - Full keyboard navigation: ArrowUp/ArrowDown (with circular wrapping), Home/End.
 * - Disabled items automatically skipped by keyboard navigation.
 * - Tab/Shift+Tab closes dropdown without hijacking natural tab progression.
 * - Escape closes dropdown and restores focus to trigger.
 * - Localized Escape handling with e.stopPropagation() prevents dismissing parent Modals.
 * - Outside click dismisses menu without unnatural focus hijacking.
 * - Controlled and uncontrolled open state support.
 * - Centralized RAF focus management with deduplication: identical pending focus targets
 *   are not cancelled and rescheduled by parent re-renders, preventing RAF starvation.
 * - Dynamic ref resolution guarantees stale indices never receive focus.
 * - Item reorder reconciliation: tracks active item by label to prevent focus from
 *   silently shifting to an unrelated action when items reorder while open.
 *   (Limitation: if multiple items share identical labels, reconciliation resolves to the first match).
 * - Soft glassmorphic surface with z-40 layering and reduced-motion compatibility.
 */
export function DropdownMenu({
  label,
  items,
  triggerText,
  trigger,
  align = "left",
  anchor = "self",
  triggerClassName,
  className,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof next === "function" ? next(isOpen) : next;
      if (!isControlled) {
        setUncontrolledOpen(resolved);
      }
      onOpenChange?.(resolved);
    },
    [isControlled, isOpen, onOpenChange]
  );

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const id = useId();
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  // Compute indices of interactive (non-separator, non-disabled) items
  const navigableIndices = useMemo(() => {
    const indices: number[] = [];
    items.forEach((it, idx) => {
      if (!isSeparator(it) && !it.disabled) {
        indices.push(idx);
      }
    });
    return indices;
  }, [items]);

  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const focusedIndexRef = useRef(focusedIndex);
  focusedIndexRef.current = focusedIndex;

  const focusedItemLabelRef = useRef<string | null>(null);

  const prevOpenRef = useRef<boolean>(false);
  const initialFocusTargetRef = useRef<"first" | "last">("first");
  const focusFrameRef = useRef<number | null>(null);
  const pendingFocusTargetRef = useRef<"first" | "last" | number | "panel" | null>(null);

  const navigableIndicesRef = useRef(navigableIndices);
  navigableIndicesRef.current = navigableIndices;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Centralized cancellation helper: used on genuine menu close and unmount
  const cancelPendingFocus = useCallback(() => {
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }
    pendingFocusTargetRef.current = null;
  }, []);

  // Centralized focus scheduler:
  // 1. Deduplicates requests: if the identical focus target is already pending execution,
  //    it leaves the pending RAF intact rather than cancelling and pushing it back.
  // 2. Replaces requests when a genuinely different target is requested.
  // 3. Resolves current indices and refs dynamically at RAF execution time.
  const requestFocus = useCallback(
    (target: "first" | "last" | number | "panel") => {
      if (focusFrameRef.current !== null && pendingFocusTargetRef.current === target) {
        return;
      }

      if (focusFrameRef.current !== null) {
        cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
      pendingFocusTargetRef.current = target;

      focusFrameRef.current = requestAnimationFrame(() => {
        focusFrameRef.current = null;
        const requested = pendingFocusTargetRef.current;
        pendingFocusTargetRef.current = null;
        if (requested === null) return;

        const currentIndices = navigableIndicesRef.current;
        const currentItems = itemsRef.current;

        if (requested === "panel" || currentIndices.length === 0) {
          panelRef.current?.focus();
          setFocusedIndex(-1);
          focusedItemLabelRef.current = null;
          return;
        }

        let targetIdx: number;
        if (requested === "first") {
          targetIdx = currentIndices[0]!;
        } else if (requested === "last") {
          targetIdx = currentIndices[currentIndices.length - 1]!;
        } else {
          // Specific index requested from reconciliation
          if (currentIndices.includes(requested)) {
            targetIdx = requested;
          } else {
            // Index is no longer navigable; find closest remaining index
            const closest = currentIndices.find((idx) => idx >= requested);
            targetIdx = closest ?? currentIndices[currentIndices.length - 1]!;
          }
        }

        setFocusedIndex(targetIdx);
        const activeItem = currentItems[targetIdx];
        if (activeItem && !isSeparator(activeItem)) {
          focusedItemLabelRef.current = activeItem.label;
        }
        itemRefs.current[targetIdx]?.focus();
      });
    },
    []
  );

  // Unmount cleanup: ensures no orphaned animation frame runs after unmount
  useEffect(() => {
    return () => {
      prevOpenRef.current = false;
      cancelPendingFocus();
      focusedItemLabelRef.current = null;
    };
  }, [cancelPendingFocus]);

  // Effect 1: Handles OPEN / CLOSE transitions exclusively.
  // Genuine close cancels pending frames; genuine open schedules initial focus.
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = isOpen;

    // Genuine close: cancel pending focus requests and reset focusedIndex
    if (wasOpen && !isOpen) {
      cancelPendingFocus();
      setFocusedIndex(-1);
      focusedItemLabelRef.current = null;
      return;
    }

    // Genuine open (closed -> open transition)
    if (!wasOpen && isOpen) {
      const target = initialFocusTargetRef.current;
      initialFocusTargetRef.current = "first"; // reset target for next open
      requestFocus(target);
    }
  }, [isOpen, requestFocus, cancelPendingFocus]);

  // Effect 2: Reconciles focused item if it is reordered, removed, or disabled while open.
  // Re-evaluates item identity using label tracking and schedules requestFocus if needed.
  useEffect(() => {
    if (!isOpen) return;

    const currentFocused = focusedIndexRef.current;
    if (currentFocused === -1) return;

    const currentItems = itemsRef.current;
    const currentItem = currentItems[currentFocused];
    const expectedLabel = focusedItemLabelRef.current;

    // Check if the item at currentFocused is still the exact same enabled item
    const isSameItemStillValid =
      currentItem !== undefined &&
      !isSeparator(currentItem) &&
      currentItem.label === expectedLabel &&
      !currentItem.disabled;

    if (isSameItemStillValid) {
      // Current focused item is still at the same position and valid.
      return;
    }

    // If the item moved to a new index while remaining enabled, follow it:
    let resolvedTarget: "panel" | number = "panel";
    if (expectedLabel !== null) {
      const movedIndex = currentItems.findIndex(
        (it) => !isSeparator(it) && it.label === expectedLabel && !it.disabled
      );
      if (movedIndex !== -1) {
        resolvedTarget = movedIndex;
      }
    }

    // If the item was removed or disabled completely, fallback to closest remaining index:
    if (resolvedTarget === "panel" && navigableIndices.length > 0) {
      const closest = navigableIndices.find((idx) => idx >= currentFocused);
      resolvedTarget = closest ?? navigableIndices[navigableIndices.length - 1]!;
    }

    requestFocus(resolvedTarget);
  }, [isOpen, navigableIndices, requestFocus]);

  // Outside click closes dropdown without forcibly hijacking focus
  useOutsideClick(wrapperRef, () => {
    setOpen(false);
  }, isOpen);

  // Localized keyboard navigation on the wrapper container
  // Handles Escape, Tab, Arrow keys, Home, End
  // e.stopPropagation() on Escape prevents closing any parent Modal
  const handleWrapperKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelPendingFocus();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === "Tab") {
      // Allow natural focus shift while closing the popover
      cancelPendingFocus();
      setOpen(false);
      return;
    }

    if (navigableIndices.length === 0) return;

    const currentPos = navigableIndices.indexOf(focusedIndex);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      cancelPendingFocus();
      const nextPos =
        currentPos === -1 || currentPos === navigableIndices.length - 1
          ? 0
          : currentPos + 1;
      const targetIdx = navigableIndices[nextPos]!;
      setFocusedIndex(targetIdx);
      const activeItem = items[targetIdx];
      if (activeItem && !isSeparator(activeItem)) {
        focusedItemLabelRef.current = activeItem.label;
      }
      itemRefs.current[targetIdx]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      cancelPendingFocus();
      const prevPos =
        currentPos <= 0
          ? navigableIndices.length - 1
          : currentPos - 1;
      const targetIdx = navigableIndices[prevPos]!;
      setFocusedIndex(targetIdx);
      const activeItem = items[targetIdx];
      if (activeItem && !isSeparator(activeItem)) {
        focusedItemLabelRef.current = activeItem.label;
      }
      itemRefs.current[targetIdx]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      e.stopPropagation();
      cancelPendingFocus();
      const targetIdx = navigableIndices[0]!;
      setFocusedIndex(targetIdx);
      const activeItem = items[targetIdx];
      if (activeItem && !isSeparator(activeItem)) {
        focusedItemLabelRef.current = activeItem.label;
      }
      itemRefs.current[targetIdx]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      e.stopPropagation();
      cancelPendingFocus();
      const targetIdx = navigableIndices[navigableIndices.length - 1]!;
      setFocusedIndex(targetIdx);
      const activeItem = items[targetIdx];
      if (activeItem && !isSeparator(activeItem)) {
        focusedItemLabelRef.current = activeItem.label;
      }
      itemRefs.current[targetIdx]?.focus();
    }
  };

  // Handle keyboard activation from trigger button when closed
  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (isOpen) return;

    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      initialFocusTargetRef.current = "first";
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      initialFocusTargetRef.current = "last";
      setOpen(true);
    }
  };

  // Safe item selection
  const handleItemSelect = (item: DropdownItem) => {
    if (item.disabled) return;
    cancelPendingFocus();
    setOpen(false);
    item.onSelect();
  };

  return (
    <div
      ref={wrapperRef}
      className="menu"
      data-anchor={anchor}
      onKeyDown={handleWrapperKeyDown}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={cn("btn btn-sec", triggerClassName)}
        style={{ padding: "8px 10px" }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-label={label}
        onClick={() => {
          if (!isOpen) {
            initialFocusTargetRef.current = "first";
          }
          setOpen((prev) => !prev);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        {trigger !== undefined ? (
          trigger
        ) : (
          <>
            <Icon name="MoreHorizontal" />
            {triggerText && (
              <span className="font-semibold text-sm">{triggerText}</span>
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          tabIndex={-1}
          aria-orientation="vertical"
          aria-labelledby={triggerId}
          className={cn(
            "glass glass-pop menu-panel animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none",
            className
          )}
          data-align={align}
        >
          {items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 select-none">
              No options available
            </div>
          ) : (
            items.map((it, idx) => {
              if (isSeparator(it)) {
                return (
                  <div
                    key={`separator-${idx}`}
                    role="separator"
                    aria-orientation="horizontal"
                    className="my-1 border-t border-slate-200/60 dark:border-white/[0.08]"
                  />
                );
              }

              const isFocused = focusedIndex === idx;

              return (
                <button
                  key={`item-${idx}-${it.label}`}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={isFocused ? 0 : -1}
                  disabled={it.disabled}
                  aria-disabled={it.disabled ? "true" : undefined}
                  className={cn(
                    "menu-item",
                    it.danger && "danger",
                    it.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
                  )}
                  onClick={() => handleItemSelect(it)}
                >
                  {it.icon && <Icon name={it.icon} size={16} />}
                  <span>{it.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
