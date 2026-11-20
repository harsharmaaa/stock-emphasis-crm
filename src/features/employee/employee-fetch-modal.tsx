"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getEmployeeFetchSourcesAction,
  employeeFetchSourceLeadsAction,
  type EmployeeFetchSourceItem,
} from "./lead-actions";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

interface EmployeeFetchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadFetched: () => void;
}

export function EmployeeFetchModal({
  isOpen,
  onClose,
  onLeadFetched,
}: EmployeeFetchModalProps) {
  if (!isOpen) return null;

  return (
    <EmployeeFetchModalContent
      onClose={onClose}
      onLeadFetched={onLeadFetched}
    />
  );
}

function EmployeeFetchModalContent({
  onClose,
  onLeadFetched,
}: {
  onClose: () => void;
  onLeadFetched: () => void;
}) {
  const [sources, setSources] = useState<EmployeeFetchSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fetchingSource, setFetchingSource] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    try {
      const res = await getEmployeeFetchSourcesAction();
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
    getEmployeeFetchSourcesAction()
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
      const res = await employeeFetchSourceLeadsAction(sourceName);
      if (res.success) {
        setSuccessMsg(
          `Successfully claimed ${res.allocatedCount ?? 0} leads from "${sourceName}"!`
        );
        onLeadFetched();
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
      <div className="fixed inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-xl rounded-2xl bg-[#121826] border border-slate-700/60 shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Select Source
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="size-4" />
          </button>
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

        {/* Content Table / Loading State */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="size-6 animate-spin text-cyan-500" />
            <span>Checking permitted lead sources & limits...</span>
          </div>
        ) : sources.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <AlertCircle className="size-8 mx-auto text-amber-500/70" />
            <p className="font-semibold text-slate-300">No Fetch Rules Assigned</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Your Administrator has not assigned any lead fetch quotas to your user account or profile.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800 border-t border-b border-slate-800">
            {sources.map((item) => {
              const isFetchingThis = fetchingSource === item.source;
              const isAnyFetching = Boolean(fetchingSource);

              return (
                <div
                  key={item.source}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  {/* Left Column: Source Name + Subtitle Details */}
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-white tracking-wide block">
                      {item.source}
                    </span>
                    <span className="text-xs text-slate-400 font-mono block">
                      Limit: {item.formattedRemaining}
                    </span>
                  </div>

                  {/* Right Column: Status Badges or Action Button */}
                  <div>
                    {item.status === "LEADS_AVAILABLE" ? (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-md text-xs font-semibold bg-[#1e40af] text-blue-100 border border-blue-600/40 select-none shadow-xs">
                        Leads Available ({item.availableLeadsCount}/{item.availableLimit})
                      </span>
                    ) : item.status === "NO_LEADS" ? (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-md text-xs font-semibold bg-[#9a3412] text-amber-100 border border-amber-600/40 select-none shadow-xs">
                        No Leads
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isAnyFetching}
                        onClick={() => handleFetch(item.source)}
                        className="inline-flex items-center justify-center gap-1.5 px-6 py-1.5 rounded-md text-xs font-bold text-white bg-[#15803d] hover:bg-[#16a34a] border border-green-500/40 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {isFetchingThis ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Fetching...</span>
                          </>
                        ) : (
                          <span>Fetch</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
