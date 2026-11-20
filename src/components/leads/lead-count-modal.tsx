"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  X,
  Filter,
  Calendar,
  IndianRupee,
  Phone,
  RotateCcw,
  Loader2,
  TableProperties,
  Search,
} from "lucide-react";
import type {
  EmployeeLeadCountFiltersInput,
  LeadCountSummaryResult,
  DispositionBreakdownItem,
} from "@/src/features/employee/lead-actions";

export interface LeadCountFilterApplyPayload {
  selectedKeys: string[];
  selectedStages: string[];
  selectedResponses: string[];
  lastUpdateDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  leadSource?: string | null;
  leadResponse?: string | null;
  trialStatus?: string | null;
  serviceStatus?: string | null;
  serviceId?: string | null;
  leadRecycleCount?: string | null;
  paidRange?: string | null;
  mobile?: string | null;
}

export interface LeadCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "employee" | "admin";
  fetchCountsAction: (
    filters: EmployeeLeadCountFiltersInput
  ) => Promise<LeadCountSummaryResult>;
  onSelectStageOrResponse?: (selection: {
    type: "stage" | "response";
    value: string;
  }) => void;
  onApplyFilters?: (filters: LeadCountFilterApplyPayload) => void;
  onResetFilters?: () => void;
}

export function LeadCountModal({
  isOpen,
  onClose,
  mode = "employee",
  fetchCountsAction,
  onSelectStageOrResponse,
  onApplyFilters,
  onResetFilters,
}: LeadCountModalProps) {
  if (!isOpen) return null;

  return (
    <LeadCountModalContent
      onClose={onClose}
      mode={mode}
      fetchCountsAction={fetchCountsAction}
      onSelectStageOrResponse={onSelectStageOrResponse}
      onApplyFilters={onApplyFilters}
      onResetFilters={onResetFilters}
    />
  );
}

function LeadCountModalContent({
  onClose,
  mode,
  fetchCountsAction,
  onSelectStageOrResponse,
  onApplyFilters,
  onResetFilters,
}: {
  onClose: () => void;
  mode: "employee" | "admin";
  fetchCountsAction: (
    filters: EmployeeLeadCountFiltersInput
  ) => Promise<LeadCountSummaryResult>;
  onSelectStageOrResponse?: (selection: {
    type: "stage" | "response";
    value: string;
  }) => void;
  onApplyFilters?: (filters: LeadCountFilterApplyPayload) => void;
  onResetFilters?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<LeadCountSummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters state (Right Column)
  const [lastUpdateDate, setLastUpdateDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [leadResponse, setLeadResponse] = useState("");
  const [trialStatus, setTrialStatus] = useState("");
  const [serviceStatus, setServiceStatus] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [leadRecycleCount, setLeadRecycleCount] = useState("");
  const [paidRange, setPaidRange] = useState("");
  const [mobile, setMobile] = useState("");

  // Checkbox selection state (Left Column)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const loadCounts = useCallback(
    (customFilters?: Partial<EmployeeLeadCountFiltersInput>) => {
      startTransition(async () => {
        setError(null);
        try {
          const payload: EmployeeLeadCountFiltersInput = {
            lastUpdateDate: lastUpdateDate || null,
            startDate: startDate || null,
            endDate: endDate || null,
            leadSource: leadSource || null,
            leadResponse: leadResponse || null,
            trialStatus: trialStatus || null,
            serviceStatus: serviceStatus || null,
            serviceId: serviceId || null,
            leadRecycleCount: leadRecycleCount || null,
            mobile: mobile || null,
            paidRange: paidRange || null,
            ...customFilters,
          };

          const res = await fetchCountsAction(payload);
          if (res.success) {
            setData(res);
          } else {
            setError(res.error || "Failed to load lead count breakdown.");
          }
        } catch {
          setError("An unexpected error occurred while loading counts.");
        }
      });
    },
    [
      fetchCountsAction,
      lastUpdateDate,
      startDate,
      endDate,
      leadSource,
      leadResponse,
      trialStatus,
      serviceStatus,
      serviceId,
      leadRecycleCount,
      mobile,
      paidRange,
    ]
  );

  // Initial load
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Handle Select All
  const handleToggleSelectAll = () => {
    if (!data) return;
    if (selectedKeys.size === data.breakdown.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(data.breakdown.map((item) => item.key)));
    }
  };

  const handleToggleItem = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSearchAndApply = () => {
    const stages: string[] = [];
    const responses: string[] = [];

    if (data?.breakdown) {
      for (const item of data.breakdown) {
        if (selectedKeys.has(item.key)) {
          if (item.type === "stage") {
            stages.push(item.value);
          } else if (item.type === "response") {
            responses.push(item.value);
          }
        }
      }
    }

    const payload: LeadCountFilterApplyPayload = {
      selectedKeys: Array.from(selectedKeys),
      selectedStages: stages,
      selectedResponses: responses,
      lastUpdateDate: lastUpdateDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      leadSource: leadSource || null,
      leadResponse: leadResponse || null,
      trialStatus: trialStatus || null,
      serviceStatus: serviceStatus || null,
      serviceId: serviceId || null,
      leadRecycleCount: leadRecycleCount || null,
      paidRange: paidRange || null,
      mobile: mobile || null,
    };

    if (onApplyFilters) {
      onApplyFilters(payload);
    }
    onClose();
  };

  const handleResetFilters = () => {
    setLastUpdateDate("");
    setStartDate("");
    setEndDate("");
    setLeadSource("");
    setLeadResponse("");
    setTrialStatus("");
    setServiceStatus("");
    setServiceId("");
    setLeadRecycleCount("");
    setPaidRange("");
    setMobile("");
    setSelectedKeys(new Set());
    loadCounts({
      lastUpdateDate: null,
      startDate: null,
      endDate: null,
      leadSource: null,
      leadResponse: null,
      trialStatus: null,
      serviceStatus: null,
      serviceId: null,
      leadRecycleCount: null,
      mobile: null,
      paidRange: null,
    });
    if (onResetFilters) {
      onResetFilters();
    }
  };

  // Compute total of selected rows
  const selectedTotal = data?.breakdown
    .filter((b) => selectedKeys.has(b.key))
    .reduce((sum, b) => sum + b.count, 0);

  const isAllSelected =
    data && data.breakdown.length > 0 && selectedKeys.size === data.breakdown.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Main Dialog Card matching image_40e467.jpg */}
      <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.1] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <TableProperties className="size-5 text-slate-700 dark:text-slate-300" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              ALL Lead Count
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Filter className="size-3.5 text-slate-500" />
              <span>Filters</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* 2-Column Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Disposition & Stage Breakdown Table (7 cols on desktop) */}
          <div className="md:col-span-7 flex flex-col rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/40 shadow-2xs overflow-hidden">
            {/* Table Container */}
            <div className="flex-1 overflow-y-auto max-h-[460px] divide-y divide-slate-100 dark:divide-white/[0.05]">
              {/* Select All Row */}
              <div
                onClick={handleToggleSelectAll}
                className="px-4 py-2.5 flex items-center gap-3 bg-slate-50/70 dark:bg-slate-900/70 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors select-none"
              >
                <input
                  type="checkbox"
                  checked={isAllSelected ?? false}
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select All
                </span>
              </div>

              {/* Breakdown Rows */}
              {isPending && !data ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="size-6 animate-spin text-cyan-500" />
                  <span>Computing disposition counts...</span>
                </div>
              ) : data?.breakdown && data.breakdown.length > 0 ? (
                data.breakdown.map((item: DispositionBreakdownItem) => {
                  const isChecked = selectedKeys.has(item.key);

                  // Color styling matching screenshot
                  let labelColor = "text-slate-700 dark:text-slate-300";
                  if (item.value === "UNREAD") {
                    labelColor = "text-blue-600 dark:text-blue-400 font-semibold";
                  } else if (["FOLLOW_UP", "TRIAL", "CLIENT"].includes(item.value)) {
                    labelColor = "text-teal-600 dark:text-teal-400 font-semibold";
                  }

                  return (
                    <div
                      key={item.key}
                      onClick={() => handleToggleItem(item.key)}
                      className={`px-4 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer select-none ${
                        isChecked
                          ? "bg-cyan-500/10 dark:bg-cyan-950/30"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleItem(item.key)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className={`truncate ${labelColor}`}>
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onSelectStageOrResponse && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onApplyFilters) {
                                onApplyFilters({
                                  selectedKeys: [item.key],
                                  selectedStages: item.type === "stage" ? [item.value] : [],
                                  selectedResponses: item.type === "response" ? [item.value] : [],
                                  lastUpdateDate: lastUpdateDate || null,
                                  startDate: startDate || null,
                                  endDate: endDate || null,
                                  leadSource: leadSource || null,
                                  leadResponse: leadResponse || null,
                                  trialStatus: trialStatus || null,
                                  serviceStatus: serviceStatus || null,
                                  serviceId: serviceId || null,
                                  leadRecycleCount: leadRecycleCount || null,
                                  paidRange: paidRange || null,
                                  mobile: mobile || null,
                                });
                              }
                              onSelectStageOrResponse({
                                type: item.type,
                                value: item.value,
                              });
                              onClose();
                            }}
                            className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                            title="Filter list by this item"
                          >
                            View
                          </button>
                        )}
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200 min-w-[36px] text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No leads found matching current filters.
                </div>
              )}
            </div>

            {/* Sticky Summary Footer */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span>
                {selectedKeys.size > 0
                  ? `Selected (${selectedKeys.size})`
                  : "Total"}
              </span>
              <span className="font-mono text-sm">
                {selectedKeys.size > 0
                  ? `${selectedTotal} / ${data?.totalCount ?? 0}`
                  : (data?.totalCount ?? 0)}
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Quick Filters Panel (5 cols on desktop) */}
          <div className="md:col-span-5 space-y-3">
            {/* 1. Last Update Date */}
            <div className="relative">
              <div className="flex items-center px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs">
                <Calendar className="size-4 text-purple-600 dark:text-purple-400 mr-2 shrink-0" />
                <input
                  type="date"
                  value={lastUpdateDate}
                  onChange={(e) => {
                    setLastUpdateDate(e.target.value);
                    loadCounts({ lastUpdateDate: e.target.value });
                  }}
                  className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  title="Last Update Date"
                />
              </div>
            </div>

            {/* 2. Date Range */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs">
                <Calendar className="size-3.5 text-purple-600 dark:text-purple-400 mr-1.5 shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    loadCounts({ startDate: e.target.value });
                  }}
                  className="w-full bg-transparent text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  title="Start Date"
                />
              </div>
              <div className="flex items-center px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    loadCounts({ endDate: e.target.value });
                  }}
                  className="w-full bg-transparent text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  title="End Date"
                />
              </div>
            </div>

            {/* 3. Source Dropdown */}
            <div>
              <select
                value={leadSource}
                onChange={(e) => {
                  setLeadSource(e.target.value);
                  loadCounts({ leadSource: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">-- Source --</option>
                {data?.sources?.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Call Response Dropdown */}
            <div>
              <select
                value={leadResponse}
                onChange={(e) => {
                  setLeadResponse(e.target.value);
                  loadCounts({ leadResponse: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">-- Call Response --</option>
                {data?.responses?.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Trial Status Dropdown */}
            <div>
              <select
                value={trialStatus}
                onChange={(e) => {
                  setTrialStatus(e.target.value);
                  loadCounts({ trialStatus: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">-- Trial Status --</option>
                <option value="APPROVED">Approved</option>
                <option value="RUNNING">Running</option>
                <option value="EXPIRED">Expired</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* 6. Service Status Dropdown */}
            <div>
              <select
                value={serviceStatus}
                onChange={(e) => {
                  setServiceStatus(e.target.value);
                  loadCounts({ serviceStatus: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">-- Service Status --</option>
                <option value="APPROVED">Approved</option>
                <option value="RUNNING">Running</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* 7. Service (Product) Dropdown */}
            <div>
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  loadCounts({ serviceId: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">-- Service --</option>
                {data?.products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 8. Lead Added By (Locked in Employee Mode) */}
            {mode === "admin" ? (
              <div>
                <select className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                  <option value="">-- Lead Added By --</option>
                </select>
              </div>
            ) : null}

            {/* 9. Lead Owner (Locked in Employee Mode) */}
            {mode === "admin" ? (
              <div>
                <select className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                  <option value="">-- Lead Owner --</option>
                </select>
              </div>
            ) : null}

            {/* 10. Team (Locked in Employee Mode) */}
            {mode === "admin" ? (
              <div>
                <select className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                  <option value="">-- Team --</option>
                </select>
              </div>
            ) : null}

            {/* 11. Lead Recycle Count */}
            <div>
              <input
                type="text"
                placeholder="Lead Recycle Count"
                value={leadRecycleCount}
                onChange={(e) => setLeadRecycleCount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* 12. Paid Amount Range */}
            <div className="flex items-center px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs">
              <IndianRupee className="size-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Paid Ex: 500-1000"
                value={paidRange}
                onChange={(e) => setPaidRange(e.target.value)}
                onBlur={() => loadCounts({ paidRange })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadCounts({ paidRange });
                }}
                className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* 13. Mobile */}
            <div className="flex items-center px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs">
              <Phone className="size-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                onBlur={() => loadCounts({ mobile })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadCounts({ mobile });
                }}
                className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Filter Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleSearchAndApply}
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
