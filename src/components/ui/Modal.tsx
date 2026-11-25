"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type MouseEvent,
  type CSSProperties,
} from "react";
import { cn } from "@/src/lib/utils";
import { Icon } from "@/src/components/ui/Icon";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  /** Whether the modal is open. Defaults to true (conditional mounting controls visibility). */
  open?: boolean;
  /** Callback fired when the modal requests to close. */
  onClose: () => void;
  /** Title displayed in the modal header and linked via aria-labelledby. */
  title?: ReactNode;
  /** Optional description/subtitle linked via aria-describedby. */
  description?: ReactNode;
  /** Main modal content. */
  children: ReactNode;
  /** Optional footer actions (buttons) aligned to the end. */
  footer?: ReactNode;
  /** Modal width variant. Defaults to 'md'. */
  size?: ModalSize;
  /** Accessible label when no visible title is provided. Defaults to 'Dialog'. */
  ariaLabel?: string;
  /** Whether to show the top-right close icon button. Defaults to true. */
  showCloseButton?: boolean;
  /** Whether pressing Escape closes the modal. Defaults to true. */
  closeOnEscape?: boolean;
  /** Whether clicking the backdrop overlay closes the modal. Defaults to true. */
  closeOnBackdropClick?: boolean;
  /** Custom class name applied to the modal dialog card. */
  className?: string;
  /** Custom class name applied to the backdrop overlay. */
  overlayClassName?: string;
  /** Custom inline styles for the modal card. */
  style?: CSSProperties;
}

const sizeStyles: Record<ModalSize, { maxWidth: string }> = {
  sm: { maxWidth: "384px" },
  md: { maxWidth: "448px" },
  lg: { maxWidth: "560px" },
  xl: { maxWidth: "672px" },
  full: { maxWidth: "960px" },
};

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"]):not([inert])',
  'area[href]:not([tabindex="-1"]):not([inert])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]):not([inert])',
  'select:not([disabled]):not([tabindex="-1"]):not([inert])',
  'textarea:not([disabled]):not([tabindex="-1"]):not([inert])',
  'button:not([disabled]):not([tabindex="-1"]):not([inert])',
  'iframe:not([tabindex="-1"]):not([inert])',
  '[tabindex]:not([tabindex="-1"]):not([disabled]):not([inert])',
  '[contenteditable="true"]:not([tabindex="-1"]):not([inert])',
].join(", ");

/** Filters elements to only those truly interactive, visible, non-disabled (including fieldset :disabled), and not inert or aria-hidden. */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );

  return elements.filter((el) => {
    // 1. Exclude controls matching :disabled (including controls disabled via parent <fieldset disabled>)
    if (el.matches(":disabled") || (el as HTMLButtonElement | HTMLInputElement).disabled) {
      return false;
    }
    // 2. Exclude any element with a negative tabindex (e.g. tabindex="-1", tabindex="-2")
    const tabIndexAttr = el.getAttribute("tabindex");
    if (el.tabIndex < 0 || (tabIndexAttr !== null && Number(tabIndexAttr) < 0)) {
      return false;
    }
    // 3. Exclude elements marked aria-hidden or inside an aria-hidden ancestor
    if (el.closest('[aria-hidden="true"]')) {
      return false;
    }
    // 3. Exclude elements inside inert containers
    if (el.closest("[inert]")) {
      return false;
    }
    // 4. Exclude computed hidden / collapsed elements
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    ) {
      return false;
    }
    // 5. Check visibility dimensions
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  });
}

// Module-level stack of active modals for stable nested-safe Escape handling and body scroll locking
interface ActiveModalEntry {
  id: string;
  closeOnEscapeRef: React.RefObject<boolean>;
  onCloseRef: React.RefObject<() => void>;
  ref: React.RefObject<HTMLDivElement | null>;
}

const activeModals: ActiveModalEntry[] = [];
let originalBodyOverflow = "";

/**
 * Accessible Soft Glassmorphism Modal Dialog Component.
 * Features:
 * - WAI-ARIA role="dialog", aria-modal="true", and reciprocal labeling.
 * - Focus management: initial focus, Tab / Shift+Tab trapping including recovery when focus leaves, and focus restoration on unmount.
 * - Stable nested modal stack: callback identity changes do not reorder modals; Escape closes only topmost modal.
 * - Fieldset-aware disabled & aria-hidden focusable filtering.
 * - Body scroll lock with nested-modal counter safety.
 * - Selectable text: users can select and copy content normally.
 * - Pure CSS animations with prefers-reduced-motion support (zero Framer Motion).
 * - Layered at established modal depth (z-50).
 */
export function Modal({
  open = true,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  ariaLabel,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  className,
  overlayClassName,
  style,
}: ModalProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descId = `${generatedId}-desc`;

  const modalRef = useRef<HTMLDivElement>(null);

  // Keep latest callback values available without triggering re-registration or stack reordering
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  });

  // 1. Manage modal stack and body scroll locking with stable ordering
  useEffect(() => {
    if (!open) return;

    const entry: ActiveModalEntry = {
      id: generatedId,
      closeOnEscapeRef,
      onCloseRef,
      ref: modalRef,
    };

    if (activeModals.length === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeModals.push(entry);

    return () => {
      const idx = activeModals.findIndex((m) => m.id === generatedId);
      if (idx !== -1) {
        activeModals.splice(idx, 1);
      }
      if (activeModals.length === 0) {
        document.body.style.overflow = originalBodyOverflow;
      }
    };
  }, [open, generatedId]);

  // 2. Initial focus and focus restoration
  useEffect(() => {
    if (!open) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;

    const focusTimer = requestAnimationFrame(() => {
      if (!modalRef.current) return;
      const focusable = getFocusableElements(modalRef.current);
      const focusTarget = focusable[0] || modalRef.current;
      focusTarget.focus();
    });

    return () => {
      cancelAnimationFrame(focusTimer);
      try {
        previousActiveElement?.focus?.();
      } catch {
        // Element may have unmounted
      }
    };
  }, [open]);

  // 3. Document-level keyboard listener (Escape handling for topmost modal + Tab focus trap)
  useEffect(() => {
    if (!open) return;

    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      // Check if this modal instance is the topmost active modal
      const isTopModal = activeModals[activeModals.length - 1]?.id === generatedId;
      if (!isTopModal) return;

      // Handle Escape for topmost modal only
      if (e.key === "Escape") {
        if (closeOnEscapeRef.current) {
          e.preventDefault();
          e.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      // Handle Tab key focus trap
      if (e.key === "Tab") {
        const container = modalRef.current;
        if (!container) return;

        const focusable = getFocusableElements(container);

        // Case A: No focusable elements inside the modal - keep focus on container
        if (focusable.length === 0) {
          e.preventDefault();
          container.focus();
          return;
        }

        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        const active = document.activeElement;
        const isInside = container.contains(active);

        // Case B: Focus unexpectedly moved outside the modal - pull it back inside
        if (!isInside) {
          e.preventDefault();
          if (e.shiftKey) {
            last.focus();
          } else {
            first.focus();
          }
          return;
        }

        // Case C: Focus is inside modal, loop at boundaries
        if (e.shiftKey) {
          if (active === first || active === container) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    // Use capture phase to intercept Tab and Escape reliably
    document.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [open, generatedId]);

  // 4. Backdrop click handler
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  if (!open) return null;

  const accessibleName = title ? undefined : (ariaLabel || "Dialog");

  return (
    <div
      role="presentation"
      className={cn("overlay animate-in fade-in duration-150", overlayClassName)}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        aria-label={accessibleName}
        tabIndex={-1}
        className={cn(
          "glass glass-pop modal animate-in fade-in zoom-in-95 duration-150 focus-visible:outline-none",
          className
        )}
        style={{ ...sizeStyles[size], ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-3 mb-3.5">
            <div className="min-w-0 flex-1">
              {title && (
                <h3
                  id={titleId}
                  className="text-lg font-semibold text-[var(--text)] tracking-tight truncate m-0"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p
                  id={descId}
                  className="text-xs text-[var(--muted)] mt-1 mb-0 leading-relaxed"
                >
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                aria-label="Close dialog"
                className="btn btn-sec shrink-0 p-1.5 h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                onClick={onClose}
              >
                <Icon name="X" size={16} />
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body text-sm text-[var(--text)]">{children}</div>

        {/* Modal Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
