"use client";

import { useState, useEffect } from "react";
import { X, Clock, Loader2, AlertCircle, History, RotateCcw } from "lucide-react";
import {
  getAdminLeadTimelineAction,
  type AdminLeadTimelineItem,
} from "./actions";

interface AdminLeadTimelineModalProps {
  lead: { id: string; name: string; mobile: string } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminLeadTimelineModal({
  lead,
  isOpen,
  onClose,
}: AdminLeadTimelineModalProps) {
  if (!isOpen || !lead) return null;

  return (
    <AdminLeadTimelineModalContent
      key={lead.id}
      lead={lead}
      onClose={onClose}
    />
  );
}

function AdminLeadTimelineModalContent({
  lead,
  onClose,
}: {
  lead: { id: string; name: string; mobile: string };
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [timelineItems, setTimelineItems] = useState<AdminLeadTimelineItem[]>([]);
  const [timelineClearedAt, setTimelineClearedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getAdminLeadTimelineAction(lead.id)
      .then((res) => {
        if (!isMounted) return;
        setLoading(false);
        if (res.success && res.timeline) {
          setTimelineItems(res.timeline);
          setTimelineClearedAt(res.timelineClearedAt || null);
        } else {
          setError(res.error || "Failed to load activity timeline.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : "Error loading timeline.");
      });

    return () => {
      isMounted = false;
    };
  }, [lead.id]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const getVariantStyles = (variant?: string) => {
    switch (variant) {
      case "warning":
        return {
          dot: "bg-amber-500 ring-4 ring-amber-500/20",
          line: "border-amber-500/40",
          badge: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
        };
      case "success":
        return {
          dot: "bg-emerald-500 ring-4 ring-emerald-500/20",
          line: "border-emerald-500/40",
          badge: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
        };
      case "info":
        return {
          dot: "bg-cyan-500 ring-4 ring-cyan-500/20",
          line: "border-cyan-500/40",
          badge: "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20",
        };
      case "danger":
        return {
          dot: "bg-rose-500 ring-4 ring-rose-500/20",
          line: "border-rose-500/40",
          badge: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
        };
      default:
        return {
          dot: "bg-purple-500 ring-4 ring-purple-500/20",
          line: "border-purple-500/40",
          badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
        };
    }
  };

  // Filter out any activity dated strictly before the reset timestamp
  const resetAtTime = timelineClearedAt ? new Date(timelineClearedAt).getTime() : null;
  const filteredTimelineItems = resetAtTime !== null
    ? timelineItems.filter((item) => {
        if (item.badge === "RESET") return true;
        return new Date(item.timestamp).getTime() >= resetAtTime;
      })
    : timelineItems;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <History className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Activity Timeline
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {lead.name} ({lead.mobile})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close timeline"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Timeline Reset Banner */}
        {timelineClearedAt && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-3">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
              <RotateCcw className="size-4" />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold flex items-center gap-2">
                <span>Timeline Reset Active</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">
                  Pre-reset logs hidden
                </span>
              </div>
              <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 leading-relaxed">
                Previous call history, remarks, and registrations before{" "}
                <span className="font-mono font-semibold">{formatDate(timelineClearedAt)}</span> were permanently cleared during Recycle / Transfer. Showing only fresh activity.
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="size-6 animate-spin text-purple-500" />
            <span>Fetching lead history...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : filteredTimelineItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-1">
            <Clock className="size-6 mx-auto text-slate-500/50 mb-2" />
            <p className="font-semibold text-slate-300">
              {timelineClearedAt ? "No activity logged after reset" : "No activity logged"}
            </p>
            <p className="text-[11px] text-slate-500">
              Future calls, status transitions, and allotments will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {filteredTimelineItems.map((item, idx) => {
              const styles = getVariantStyles(item.variant);
              const isLast = idx === filteredTimelineItems.length - 1;
              const isReset = item.badge === "RESET";

              return (
                <div key={item.id || idx} className="relative flex items-start gap-3.5 text-xs">
                  {/* Step Connector Line */}
                  {!isLast && (
                    <div
                      className={`absolute left-[5px] top-3.5 bottom-[-16px] w-[2px] ${styles.line} border-l-2 border-dashed`}
                    />
                  )}

                  {/* Step Dot */}
                  <div
                    className={`size-3 rounded-full ${styles.dot} mt-1 shrink-0 z-10`}
                  />

                  {/* Step Card */}
                  <div
                    className={`flex-1 space-y-1.5 p-3.5 rounded-xl border ${
                      isReset
                        ? "bg-amber-500/5 dark:bg-amber-950/25 border-amber-500/30"
                        : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white font-sans text-xs">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${styles.badge}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>

                    {item.details && (
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans text-xs">
                        {item.details}
                      </p>
                    )}

                    {item.actorName && (
                      <div className="text-[10px] text-slate-400 pt-0.5">
                        Logged by: <span className="font-semibold text-slate-300">{item.actorName}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
