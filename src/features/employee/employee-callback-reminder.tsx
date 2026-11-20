"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useTransition,
  useRef,
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";
import {
  Bell,
  Clock,
  Phone,
  PhoneCall,
  CheckCircle2,
  X,
  CalendarClock,
} from "lucide-react";
import {
  getEmployeeDueCallbacksAction,
  snoozeEmployeeCallbackAction,
  dismissEmployeeCallbackAction,
  type EmployeeDueCallbackItem,
  type EmployeeLeadItem,
} from "./lead-actions";
import { EmployeeCallUpdateModal } from "./employee-call-update-modal";

interface EmployeeCallbackContextType {
  callbacks: EmployeeDueCallbackItem[];
  dueCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  snooze: (leadId: string, minutes?: number, newDate?: string) => Promise<boolean>;
  dismiss: (leadId: string, clearFromDb?: boolean) => Promise<boolean>;
  openCallModalForLead: (item: EmployeeDueCallbackItem) => void;
}

const EmployeeCallbackContext = createContext<EmployeeCallbackContextType | null>(null);

export function useEmployeeCallbacks() {
  const ctx = useContext(EmployeeCallbackContext);
  if (!ctx) {
    throw new Error("useEmployeeCallbacks must be used within EmployeeCallbackProvider");
  }
  return ctx;
}

/**
 * Storage key to track dismissed reminder IDs in this session
 * so dismissed notifications are never repeatedly shown.
 */
const SESSION_DISMISSED_KEY = "stock_emphasis_dismissed_callbacks";

function getSessionDismissedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_DISMISSED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addSessionDismissedId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getSessionDismissedIds();
    if (!current.includes(id)) {
      current.push(id);
      sessionStorage.setItem(SESSION_DISMISSED_KEY, JSON.stringify(current));
    }
  } catch {
    // ignore storage error
  }
}

let cachedNow = typeof window !== "undefined" ? Date.now() : 0;
const subscribers = new Set<() => void>();
let timerId: ReturnType<typeof setInterval> | null = null;

function subscribeTimer(callback: () => void) {
  subscribers.add(callback);
  if (!timerId && typeof window !== "undefined") {
    cachedNow = Date.now();
    timerId = setInterval(() => {
      cachedNow = Date.now();
      subscribers.forEach((fn) => fn());
    }, 30000);
  }

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0 && timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };
}

function getNowClient() {
  return cachedNow;
}

function getNowServer() {
  return 0;
}

function useCurrentTime() {
  return useSyncExternalStore(subscribeTimer, getNowClient, getNowServer);
}

/**
 * Root Provider mounted in EmployeeShell to power the Bell, Toast, and Dashboard reminders.
 */
export function EmployeeCallbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [callbacks, setCallbacks] = useState<EmployeeDueCallbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => getSessionDismissedIds());
  const [modalLead, setModalLead] = useState<EmployeeLeadItem | null>(null);
  const nowTime = useCurrentTime();

  const fetchCallbacks = useCallback(async () => {
    try {
      const res = await getEmployeeDueCallbacksAction();
      if (res.success && res.callbacks) {
        setCallbacks(res.callbacks);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and custom event listener for immediate sync
  useEffect(() => {
    let isMounted = true;
    getEmployeeDueCallbacksAction().then((res) => {
      if (isMounted && res.success && res.callbacks) {
        setCallbacks(res.callbacks);
        setLoading(false);
      }
    });

    const handleSync = () => {
      fetchCallbacks();
    };

    window.addEventListener("employee:callback-updated", handleSync);
    window.addEventListener("focus", handleSync);

    // Light check every 2.5 minutes
    const interval = setInterval(fetchCallbacks, 150000);

    return () => {
      isMounted = false;
      window.removeEventListener("employee:callback-updated", handleSync);
      window.removeEventListener("focus", handleSync);
      clearInterval(interval);
    };
  }, [fetchCallbacks]);

  const snooze = useCallback(
    async (leadId: string, minutes?: number, newDate?: string) => {
      try {
        const res = await snoozeEmployeeCallbackAction({ leadId, minutes, newDate });
        if (res.success) {
          // Remove from local dismissed list so it can trigger again when snoozed time arrives
          setDismissedIds((prev) => prev.filter((id) => id !== leadId));
          await fetchCallbacks();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [fetchCallbacks]
  );

  const dismiss = useCallback(
    async (leadId: string, clearFromDb = false) => {
      addSessionDismissedId(leadId);
      setDismissedIds((prev) => [...prev, leadId]);

      if (clearFromDb) {
        try {
          await dismissEmployeeCallbackAction({ leadId, clearCallback: true });
          await fetchCallbacks();
        } catch {
          // ignore
        }
      }
      return true;
    },
    [fetchCallbacks]
  );

  const openCallModalForLead = useCallback((item: EmployeeDueCallbackItem) => {
    const syntheticLead: EmployeeLeadItem = {
      id: item.id,
      name: item.name,
      mobile: item.mobile,
      email: null,
      state: null,
      city: null,
      district: null,
      alternateMobile: null,
      dob: null,
      aadhar: null,
      fatherName: null,
      pan: null,
      gstin: null,
      occupation: null,
      segment: null,
      investment: null,
      profile: null,
      leadResponse: item.leadResponse,
      leadSource: item.leadSource,
      description: item.description,
      experience: null,
      status: item.status,
      callbackDate: item.callbackDate,
      allotToId: null,
      teamId: null,
      createdById: null,
      createdAt: item.callbackDate,
      updatedAt: item.callbackDate,
      assignedTo: null,
      team: null,
    };
    setModalLead(syntheticLead);
  }, []);

  // Filter out session-dismissed callbacks for due count
  const activeCallbacks = callbacks.filter((c) => !dismissedIds.includes(c.id));
  const dueCount =
    nowTime > 0
      ? activeCallbacks.filter((c) => {
          const time = new Date(c.callbackDate).getTime();
          return time <= nowTime + 5 * 60 * 1000; // Due now or overdue
        }).length
      : 0;

  return (
    <EmployeeCallbackContext.Provider
      value={{
        callbacks,
        dueCount,
        loading,
        refresh: fetchCallbacks,
        snooze,
        dismiss,
        openCallModalForLead,
      }}
    >
      {children}

      {/* Floating Bottom-Right Toast for active Due Now callbacks */}
      <EmployeeCallbackToastContainer
        activeCallbacks={activeCallbacks}
        onSnooze={snooze}
        onDismiss={dismiss}
        onOpenCallModal={openCallModalForLead}
      />

      {/* Direct Call Update Modal */}
      {modalLead && (
        <EmployeeCallUpdateModal
          lead={modalLead}
          isOpen={Boolean(modalLead)}
          onClose={() => setModalLead(null)}
          onSuccess={async () => {
            setModalLead(null);
            await fetchCallbacks();
          }}
        />
      )}
    </EmployeeCallbackContext.Provider>
  );
}

/**
 * Top Navbar Reminder Bell with Popover Dropdown
 */
export function EmployeeCallbackBell() {
  const { callbacks, dueCount, snooze, dismiss, openCallModalForLead } =
    useEmployeeCallbacks();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const nowTime = useCurrentTime();

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatCallbackTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = nowTime > 0 ? nowTime : d.getTime();
    const diffMin = Math.round((d.getTime() - now) / 60000);

    if (nowTime > 0 && diffMin < -10) {
      return {
        label: `Overdue by ${Math.abs(diffMin)}m`,
        color: "text-rose-600 dark:text-rose-400 font-bold",
      };
    } else if (nowTime > 0 && diffMin <= 5) {
      return {
        label: "Due Now",
        color: "text-amber-600 dark:text-amber-400 font-bold animate-pulse",
      };
    } else {
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return {
        label: `Today at ${timeStr}`,
        color: "text-slate-500 dark:text-slate-400 font-medium",
      };
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
        aria-label="View callback reminders"
        title="Callback & Follow-up Reminders"
      >
        <Bell className="size-4.5" />
        {dueCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#090e1c] shadow-xs animate-bounce">
            {dueCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Follow-up Reminders
              </h3>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                dueCount > 0
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {dueCount > 0 ? `${dueCount} Due Now` : `${callbacks.length} Today`}
            </span>
          </div>

          {/* List or Empty State */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.05] py-1">
            {callbacks.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="size-7 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  All caught up!
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  No upcoming callbacks scheduled for today. New scheduled follow-ups will alert you here on time.
                </p>
              </div>
            ) : (
              callbacks.map((item) => {
                const timeInfo = formatCallbackTime(item.callbackDate);

                return (
                  <div key={item.id} className="py-3 space-y-2 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                            {item.mobile}
                          </span>
                        </div>
                        <div className="text-[11px] flex items-center gap-1.5 mt-0.5">
                          <Clock className="size-3 text-slate-400 shrink-0" />
                          <span className={timeInfo.color}>{timeInfo.label}</span>
                          {item.leadResponse && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              • {item.leadResponse}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Call Icon Link */}
                      <a
                        href={`tel:${item.mobile}`}
                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shrink-0"
                        title="Call Number"
                      >
                        <Phone className="size-3.5" />
                      </a>
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic bg-slate-50 dark:bg-slate-900/40 px-2 py-1 rounded-md">
                        &quot;{item.description}&quot;
                      </p>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          openCallModalForLead(item);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        Update Call
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            startTransition(async () => {
                              await snooze(item.id, 15);
                            });
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Snooze 15 minutes"
                        >
                          +15m
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            startTransition(async () => {
                              await snooze(item.id, 60);
                            });
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Snooze 1 hour"
                        >
                          +1h
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            startTransition(async () => {
                              await dismiss(item.id, false);
                            });
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Dismiss reminder"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Non-blocking, Calm Bottom-Right Toast Container
 * Alerts at most once per callback without interfering with typing or navigation.
 */
function EmployeeCallbackToastContainer({
  activeCallbacks,
  onSnooze,
  onDismiss,
  onOpenCallModal,
}: {
  activeCallbacks: EmployeeDueCallbackItem[];
  onSnooze: (leadId: string, minutes?: number) => Promise<boolean>;
  onDismiss: (leadId: string, clearFromDb?: boolean) => Promise<boolean>;
  onOpenCallModal: (item: EmployeeDueCallbackItem) => void;
}) {
  const [activeToast, setActiveToast] = useState<EmployeeDueCallbackItem | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Check every 25 seconds for callbacks reaching their due time
  useEffect(() => {
    const checkDue = () => {
      const now = Date.now();

      // Find first unnotified callback due now (between 15m overdue and 2m in future)
      const due = activeCallbacks.find((c) => {
        if (notifiedIdsRef.current.has(c.id)) return false;
        const time = new Date(c.callbackDate).getTime();
        const diff = time - now;
        return diff <= 2 * 60 * 1000 && diff >= -15 * 60 * 1000;
      });

      if (due) {
        notifiedIdsRef.current.add(due.id);
        setActiveToast(due);
      }
    };

    checkDue();
    const interval = setInterval(checkDue, 25000);
    return () => clearInterval(interval);
  }, [activeCallbacks]);

  if (!activeToast) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-5 duration-200 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <PhoneCall className="size-4 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
              Callback Due Now
            </span>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {activeToast.name}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onDismiss(activeToast.id, false);
            setActiveToast(null);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          aria-label="Dismiss callback alert"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <span className="font-mono font-medium">{activeToast.mobile}</span>
        {activeToast.leadResponse && (
          <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
            {activeToast.leadResponse}
          </span>
        )}
      </div>

      {activeToast.description && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg line-clamp-2">
          &quot;{activeToast.description}&quot;
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <a
            href={`tel:${activeToast.mobile}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
          >
            <Phone className="size-3" />
            <span>Call</span>
          </a>

          <button
            type="button"
            onClick={() => {
              const current = activeToast;
              setActiveToast(null);
              onOpenCallModal(current);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs"
          >
            <span>Update</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={async () => {
              await onSnooze(activeToast.id, 15);
              setActiveToast(null);
            }}
            className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Snooze for 15 minutes"
          >
            Snooze 15m
          </button>

          <button
            type="button"
            onClick={() => {
              onDismiss(activeToast.id, false);
              setActiveToast(null);
            }}
            className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Subtle, non-cluttering callback summary strip for the Employee Dashboard (`/employee`)
 */
export function EmployeeDashboardCallbackBanner() {
  const { callbacks, dueCount, openCallModalForLead } = useEmployeeCallbacks();
  const [isDismissed, setIsDismissed] = useState(false);
  const nowTime = useCurrentTime();

  if (isDismissed || callbacks.length === 0) return null;

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/20 backdrop-blur-xl shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <CalendarClock className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Today&apos;s Follow-up Callbacks</span>
              {dueCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {dueCount} Due Now
                </span>
              )}
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              You have {callbacks.length} scheduled callback{callbacks.length > 1 ? "s" : ""} on your agenda today.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer text-xs flex items-center gap-1 font-medium"
          title="Dismiss banner"
        >
          <X className="size-4" />
          <span className="hidden sm:inline">Dismiss</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {callbacks.slice(0, 3).map((item) => {
          const d = new Date(item.callbackDate);
          const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const isOverdue = nowTime > 0 ? d.getTime() < nowTime : false;

          return (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between gap-2 shadow-2xs"
            >
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                  {item.name}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                  {item.mobile}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    isOverdue
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-purple-600 dark:text-purple-400"
                  }`}
                >
                  {isOverdue ? "Overdue" : "Today"} • {timeStr}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`tel:${item.mobile}`}
                  className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                  title="Call lead"
                >
                  <Phone className="size-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => openCallModalForLead(item)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
