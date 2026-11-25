"use client";

import { useState, useEffect } from "react";
import { Clock, Loader2, AlertCircle, History, RotateCcw } from "lucide-react";
import {
  getAdminLeadTimelineAction,
  type AdminLeadTimelineItem,
} from "./actions";
import { Modal, Button, Badge, Card } from "@/src/components/ui";
import type { Tone } from "@/src/types/ui-kit";

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

  const getVariantStyles = (variant?: string): { dot: string; line: string; tone: Tone } => {
    switch (variant) {
      case "warning":
        return {
          dot: "bg-amber-500 ring-4 ring-amber-500/20",
          line: "border-amber-500/40",
          tone: "warn",
        };
      case "success":
        return {
          dot: "bg-emerald-500 ring-4 ring-emerald-500/20",
          line: "border-emerald-500/40",
          tone: "ok",
        };
      case "info":
        return {
          dot: "bg-cyan-500 ring-4 ring-cyan-500/20",
          line: "border-cyan-500/40",
          tone: "info",
        };
      case "danger":
        return {
          dot: "bg-rose-500 ring-4 ring-rose-500/20",
          line: "border-rose-500/40",
          tone: "err",
        };
      default:
        return {
          dot: "bg-[var(--brand)] ring-4 ring-[var(--brand)]/20",
          line: "border-[var(--brand)]/40",
          tone: "info",
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
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--brand)]/15 text-[var(--brand)] shrink-0">
            <History className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text)] tracking-tight">
              Activity Timeline
            </h2>
            <span className="text-xs text-[var(--muted)] font-normal">
              {lead.name} ({lead.mobile})
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1 max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin">
        {/* Timeline Reset Banner */}
        {timelineClearedAt && (
          <Card className="p-3.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-3">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
              <RotateCcw className="size-4" />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold flex items-center gap-2">
                <span>Timeline Reset Active</span>
                <Badge tone="warn">Pre-reset logs hidden</Badge>
              </div>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                Previous call history, remarks, and registrations before{" "}
                <span className="font-mono font-semibold">{formatDate(timelineClearedAt)}</span> were permanently cleared during Recycle / Transfer. Showing only fresh activity.
              </p>
            </div>
          </Card>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-[var(--muted)] text-xs">
            <Loader2 className="size-6 animate-spin text-[var(--brand)]" />
            <span>Fetching lead history...</span>
          </div>
        ) : error ? (
          <Card className="p-4 border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </Card>
        ) : filteredTimelineItems.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)] text-xs space-y-1">
            <Clock className="size-6 mx-auto text-[var(--muted)]/50 mb-2" />
            <p className="font-semibold text-[var(--text)]">
              {timelineClearedAt ? "No activity logged after reset" : "No activity logged"}
            </p>
            <p className="text-[11px] text-[var(--muted)]">
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
                  <Card
                    className={`flex-1 space-y-1.5 p-3.5 ${
                      isReset
                        ? "border-amber-500/30 bg-amber-500/[0.05]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text)] font-sans text-xs">
                          {item.title}
                        </span>
                        {item.badge && (
                          <Badge tone={styles.tone}>
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[var(--muted)] font-mono text-[10px]">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>

                    {item.details && (
                      <p className="text-[var(--text)] leading-relaxed font-sans text-xs opacity-90">
                        {item.details}
                      </p>
                    )}

                    {item.actorName && (
                      <div className="text-[10px] text-[var(--muted)] pt-0.5">
                        Logged by: <span className="font-semibold text-[var(--text)]">{item.actorName}</span>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
