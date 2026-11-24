"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAdminFetchSourcesAction,
  adminFetchSourceLeadsAction,
  type AdminFetchSourceItem,
} from "./actions";
import {
  Modal,
  Button,
  Badge,
  Card,
  useToast,
} from "@/src/components/ui";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface AdminFetchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadFetched: () => void;
}

export function AdminFetchModal({
  isOpen,
  onClose,
  onLeadFetched,
}: AdminFetchModalProps) {
  if (!isOpen) return null;

  return (
    <AdminFetchModalContent
      onClose={onClose}
      onLeadFetched={onLeadFetched}
    />
  );
}

function AdminFetchModalContent({
  onClose,
  onLeadFetched,
}: {
  onClose: () => void;
  onLeadFetched: () => void;
}) {
  const toast = useToast();
  const [sources, setSources] = useState<AdminFetchSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fetchingSource, setFetchingSource] = useState<string | null>(null);
  const [batchCount, setBatchCount] = useState<number>(10);

  const loadSources = useCallback(async () => {
    try {
      const res = await getAdminFetchSourcesAction();
      if (res.success && res.sources) {
        setSources(res.sources);
      } else {
        setError(res.error || "Failed to load lead sources.");
      }
    } catch {
      setError("An unexpected error occurred while loading lead sources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getAdminFetchSourcesAction()
      .then((res) => {
        if (!isMounted) return;
        setLoading(false);
        if (res.success && res.sources) {
          setSources(res.sources);
        } else {
          setError(res.error || "Failed to load lead sources.");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
        setError("An unexpected error occurred while loading lead sources.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFetch = async (sourceName: string) => {
    setFetchingSource(sourceName);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await adminFetchSourceLeadsAction({
        sourceName,
        count: batchCount,
      });

      if (res.success) {
        const msg = `Successfully claimed ${res.allocatedCount ?? 0} leads from "${sourceName}"!`;
        setSuccessMsg(msg);
        toast?.success(msg);
        onLeadFetched();
        // Refresh sources in the modal
        await loadSources();
      } else {
        const errMsg = res.error || `Failed to fetch leads for ${sourceName}.`;
        setError(errMsg);
        toast?.error(errMsg);
      }
    } catch {
      const errMsg = "An unexpected error occurred while fetching leads.";
      setError(errMsg);
      toast?.error(errMsg);
    } finally {
      setFetchingSource(null);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title="Select Source"
      description="Claim leads directly from the unassigned pool into your queue."
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
      <div className="space-y-4 pt-1">
        {/* Batch count selector */}
        <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 text-xs">
          <span className="font-medium text-[var(--text)]">Batch Size (Leads per Fetch):</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[10, 25, 50, 100].map((num) => (
              <Button
                key={num}
                type="button"
                variant={batchCount === num ? "primary" : "secondary"}
                size="sm"
                className="!h-7 !px-2.5 !text-[11px]"
                onClick={() => setBatchCount(num)}
              >
                {num}
              </Button>
            ))}
            <input
              type="number"
              min={1}
              max={500}
              value={batchCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  setBatchCount(Math.min(val, 500));
                }
              }}
              className="inp w-16 text-center font-bold text-xs py-1 h-7"
              title="Custom batch count (1-500)"
            />
          </div>
        </Card>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="size-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-[var(--muted)] gap-3">
            <Loader2 className="size-8 animate-spin text-[var(--brand)]" />
            <span className="text-xs font-medium">Loading active lead sources...</span>
          </div>
        ) : sources.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--muted)]">
            No active lead sources found in the database.
          </div>
        ) : (
          /* 4-Column Source Table */
          <div className="overflow-y-auto max-h-[50vh] border border-[var(--border)] rounded-xl">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--panel-solid)] border-b border-[var(--border)] text-[var(--muted)] font-semibold z-10">
                <tr>
                  <th className="py-3 px-3 text-left">Lead Source</th>
                  <th className="py-3 px-3 text-center">Available</th>
                  <th className="py-3 px-3 text-center">Remaining</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sources.map((item) => {
                  const isCurrentFetching = fetchingSource === item.source;

                  return (
                    <tr
                      key={item.source}
                      className="hover:bg-[var(--glass-stroke)] transition-colors"
                    >
                      {/* 1. Lead Source Name */}
                      <td className="py-3.5 px-3 text-left font-bold text-[var(--text)] text-[13px]">
                        {item.source}
                      </td>

                      {/* 2. Available unattended leads count + pool indicator */}
                      <td className="py-3.5 px-3 text-center text-[var(--text)] font-medium">
                        <div>{item.availableLeadsCount} Leads</div>
                        <span className="text-[10px] text-[var(--brand)] font-mono">
                          ({item.poolAvailableCount} in pool)
                        </span>
                      </td>

                      {/* 3. Remaining quota / total formatted */}
                      <td className="py-3.5 px-3 text-center text-[var(--text)] font-medium font-mono">
                        {item.formattedRemaining}
                      </td>

                      {/* 4. Action Button / Badge */}
                      <td className="py-3.5 px-3 text-center">
                        {item.status === "CAN_FETCH" ? (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={isCurrentFetching}
                            loading={isCurrentFetching}
                            onClick={() => handleFetch(item.source)}
                            className="min-w-[76px]"
                          >
                            Fetch
                          </Button>
                        ) : (
                          <Badge tone="err" className="min-w-[76px] justify-center">
                            No Leads
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
