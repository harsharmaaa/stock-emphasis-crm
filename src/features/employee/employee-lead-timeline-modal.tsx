"use client";

import { useState, useEffect } from "react";
import { X, Clock, Loader2, AlertCircle } from "lucide-react";
import { getEmployeeLeadTimelineAction, type EmployeeLeadItem } from "./lead-actions";

interface EmployeeLeadTimelineModalProps {
  lead: EmployeeLeadItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeeLeadTimelineModal({
  lead,
  isOpen,
  onClose,
}: EmployeeLeadTimelineModalProps) {
  if (!isOpen || !lead) return null;

  return (
    <EmployeeLeadTimelineModalContent
      key={lead.id}
      lead={lead}
      onClose={onClose}
    />
  );
}

function EmployeeLeadTimelineModalContent({
  lead,
  onClose,
}: {
  lead: EmployeeLeadItem;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<
    {
      id: string;
      action: string;
      details: string | null;
      createdAt: string;
      actor: { name: string; email: string } | null;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getEmployeeLeadTimelineAction(lead.id)
      .then((res) => {
        if (!isMounted) return;
        setLoading(false);
        if (res.success && res.activities) {
          setActivities(res.activities);
        } else {
          setError(res.error || "Failed to load timeline.");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
        setError("Error loading timeline.");
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
      });
    } catch {
      return dateStr;
    }
  };

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
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-purple-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Activity Timeline
              </h2>
              <span className="text-xs text-slate-400">
                {lead.name} ({lead.mobile})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

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
        ) : activities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-1">
            <Clock className="size-6 mx-auto text-slate-500/50 mb-2" />
            <p className="font-semibold text-slate-300">No activity logs recorded yet</p>
            <p className="text-[11px] text-slate-500">
              Future calls, status transitions, and note updates will appear here in chronological order.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {activities.map((act, idx) => (
              <div key={act.id || idx} className="flex items-start gap-3 text-xs">
                <div className="size-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <div className="flex-1 space-y-1 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {act.action}
                    </span>
                    <span className="text-slate-400">{formatDate(act.createdAt)}</span>
                  </div>
                  {act.details && (
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                      {act.details}
                    </p>
                  )}
                  {act.actor && (
                    <span className="text-[10px] text-slate-400 block pt-0.5">
                      By {act.actor.name} ({act.actor.email})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
