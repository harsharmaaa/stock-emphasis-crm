"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getManagerFetchSourcesAction,
  managerFetchSourceLeadsAction,
  type ManagerFetchSourceItem,
} from "./lead-actions";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ManagerFetchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadFetched: () => void;
}

export function ManagerFetchModal({
  isOpen,
  onClose,
  onLeadFetched,
}: ManagerFetchModalProps) {
  if (!isOpen) return null;

  return (
    <ManagerFetchModalContent
      onClose={onClose}
      onLeadFetched={onLeadFetched}
    />
  );
}

function ManagerFetchModalContent({
  onClose,
  onLeadFetched,
}: {
  onClose: () => void;
  onLeadFetched: () => void;
}) {
  const [sources, setSources] = useState<ManagerFetchSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fetchingSource, setFetchingSource] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    try {
      const res = await getManagerFetchSourcesAction();
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
    getManagerFetchSourcesAction()
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

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleFetch = async (sourceName: string) => {
    setFetchingSource(sourceName);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await managerFetchSourceLeadsAction(sourceName);
      if (res.success) {
        setSuccessMsg(
          `Successfully claimed ${res.allocatedCount ?? 0} leads from "${sourceName}"!`
        );
        onLeadFetched();
        // Refresh sources in the modal
        await loadSources();
      } else {
        setError(res.error || `Failed to fetch leads for ${sourceName}.`);
      }
    } catch {
      setError("An unexpected error occurred while fetching leads.");
    } finally {
      setFetchingSource(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container matching reference design */}
      <div
        className="relative w-full max-w-xl rounded-2xl bg-[#121826] border border-slate-700/60 shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="pb-1">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Select Source
          </h2>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="size-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="size-8 animate-spin text-cyan-400" />
            <span className="text-xs font-medium">Loading active lead sources...</span>
          </div>
        ) : sources.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No fetch sources permitted by Admin. Please contact your Administrator.
          </div>
        ) : (
          /* 4-Column Source Table matching the exact layout */
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 font-semibold">
                  <th className="py-3 px-3 text-left">Lead Source</th>
                  <th className="py-3 px-3 text-center">Available</th>
                  <th className="py-3 px-3 text-center">Remaining</th>
                  <th className="py-3 px-3 text-center">Fetch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {sources.map((item) => {
                  const isCurrentFetching = fetchingSource === item.source;

                  return (
                    <tr
                      key={item.source}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* 1. Lead Source Name */}
                      <td className="py-3.5 px-3 text-left font-bold text-white text-[13px]">
                        {item.source}
                      </td>

                      {/* 2. Available unattended leads count */}
                      <td className="py-3.5 px-3 text-center text-slate-300 font-medium">
                        {item.availableLeadsCount} Leads
                      </td>

                      {/* 3. Remaining quota / total formatted */}
                      <td className="py-3.5 px-3 text-center text-slate-300 font-medium font-mono">
                        {item.formattedRemaining}
                      </td>

                      {/* 4. Action Button / Badge matching reference colors */}
                      <td className="py-3.5 px-3 text-center">
                        {item.status === "CAN_FETCH" ? (
                          <button
                            type="button"
                            disabled={isCurrentFetching}
                            onClick={() => handleFetch(item.source)}
                            className="inline-flex items-center justify-center min-w-[76px] px-4 py-1.5 rounded-lg text-xs font-bold bg-[#2dd4bf] hover:bg-[#14b8a6] text-slate-950 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isCurrentFetching ? (
                              <Loader2 className="size-3.5 animate-spin text-slate-950" />
                            ) : (
                              "Fetch"
                            )}
                          </button>
                        ) : item.status === "LEADS_AVAILABLE" ? (
                          <span className="inline-flex items-center justify-center min-w-[76px] px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#3b82f6] text-white shadow-xs select-none">
                            Leads Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center min-w-[76px] px-4 py-1.5 rounded-lg text-xs font-bold bg-[#f87171] text-white shadow-xs select-none">
                            No Leads
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Footer with Close Button */}
        <div className="flex justify-end pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-bold bg-[#f87171] hover:bg-[#ef4444] text-white shadow-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
