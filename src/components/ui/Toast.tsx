"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/src/lib/utils";
import { Icon, type IconName } from "@/src/components/ui/Icon";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface ToastInput {
  title?: string;
  description?: string;
  /** Alias for description */
  message?: string;
  tone?: ToastTone;
  /** Duration in milliseconds. 0 = sticky (manual dismiss only). Defaults to 4500ms. */
  duration?: number;
}

export interface ToastItem extends ToastInput {
  id: string;
}

export interface ToastApi {
  /** Create a toast with full options */
  toast: (input: ToastInput) => string;
  /** Dismiss a specific toast by its ID */
  dismiss: (id: string) => void;
  /** Dismiss all active toasts */
  dismissAll: () => void;
  /** Shorthand for success toast */
  success: (titleOrMessage: string, description?: string) => string;
  /** Shorthand for error toast */
  error: (titleOrMessage: string, description?: string) => string;
  /** Shorthand for warning toast */
  warning: (titleOrMessage: string, description?: string) => string;
  /** Shorthand for info toast */
  info: (titleOrMessage: string, description?: string) => string;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<ToastTone, { icon: IconName; color: string; label: string }> = {
  success: { icon: "CircleCheck", color: "var(--ok)", label: "Success" },
  info: { icon: "Info", color: "var(--brand)", label: "Information" },
  warning: { icon: "TriangleAlert", color: "var(--warn)", label: "Warning" },
  error: { icon: "TriangleAlert", color: "var(--err)", label: "Error" },
};

const MAX_VISIBLE_TOASTS = 4;
const DEFAULT_DURATION = 4500;

export interface ToastCardProps {
  item: ToastItem;
  onClose: (id: string) => void;
}

/** Individual glass toast item with independent auto-dismiss timer and accessible live regions. */
export function ToastCard({ item, onClose }: ToastCardProps) {
  const tone = item.tone ?? "info";
  const { icon, color, label } = TONES[tone];
  const isError = tone === "error";

  const contentText = item.description || item.message;

  // Independent auto-dismiss timer per toast item with unmount and manual cleanup
  useEffect(() => {
    const duration = item.duration ?? DEFAULT_DURATION;
    if (duration <= 0) return; // sticky toast

    const timer = window.setTimeout(() => {
      onClose(item.id);
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [item.id, item.duration, onClose]);

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn("glass glass-pop toast shadow-lg select-none")}
    >
      <span
        style={{ color }}
        className="flex shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <Icon name={icon} size={18} />
      </span>

      <div className="flex-1 min-w-0 text-sm">
        <span className="sr-only">{label}: </span>
        {item.title && (
          <div className="font-semibold text-[var(--text)] leading-tight truncate">
            {item.title}
          </div>
        )}
        {contentText && (
          <div
            className={cn(
              "text-xs text-[var(--muted)] leading-relaxed break-words",
              item.title && "mt-1"
            )}
          >
            {contentText}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-ghost shrink-0 ml-1 p-1 h-6 w-6 rounded-md inline-flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
        aria-label="Dismiss notification"
        onClick={() => onClose(item.id)}
      >
        <Icon name="X" size={14} />
      </button>
    </div>
  );
}

export interface ToastProviderProps {
  children: ReactNode;
}

/** Central Toast notification provider that manages viewport and stacked notification cards. */
export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idPrefix = useId();

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setItems([]);
  }, []);

  const toast = useCallback(
    (input: ToastInput): string => {
      const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newItem: ToastItem = { ...input, id };

      setItems((prev) => {
        // Enforce maximum visible toasts (oldest items slide out when exceeding limit)
        const updated = [...prev, newItem];
        if (updated.length > MAX_VISIBLE_TOASTS) {
          return updated.slice(updated.length - MAX_VISIBLE_TOASTS);
        }
        return updated;
      });

      return id;
    },
    [idPrefix]
  );

  const success = useCallback(
    (titleOrMessage: string, description?: string) => {
      return toast({
        title: description ? titleOrMessage : undefined,
        description: description || titleOrMessage,
        tone: "success",
      });
    },
    [toast]
  );

  const error = useCallback(
    (titleOrMessage: string, description?: string) => {
      return toast({
        title: description ? titleOrMessage : undefined,
        description: description || titleOrMessage,
        tone: "error",
      });
    },
    [toast]
  );

  const warning = useCallback(
    (titleOrMessage: string, description?: string) => {
      return toast({
        title: description ? titleOrMessage : undefined,
        description: description || titleOrMessage,
        tone: "warning",
      });
    },
    [toast]
  );

  const info = useCallback(
    (titleOrMessage: string, description?: string) => {
      return toast({
        title: description ? titleOrMessage : undefined,
        description: description || titleOrMessage,
        tone: "info",
      });
    },
    [toast]
  );

  const api: ToastApi = useMemo(
    () => ({
      toast,
      dismiss,
      dismissAll,
      success,
      error,
      warning,
      info,
    }),
    [toast, dismiss, dismissAll, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="toast-viewport"
        role="region"
        aria-label="Notifications"
      >
        {items.map((it) => (
          <ToastCard key={it.id} item={it} onClose={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Hook to consume the Toast API. Must be used within a ToastProvider. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
