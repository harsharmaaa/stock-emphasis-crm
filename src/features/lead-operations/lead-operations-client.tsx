"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { CornerUpLeft, AlertTriangle, Download, Loader2, ShieldAlert } from "lucide-react";
import {
  type LeadOperationsBootstrapData,
  type LeadOperationType,
  type LeadTypeKey,
  type LeadExportRow,
  previewLeadOperationsMatchCountAction,
  executeLeadOperationAction,
} from "./actions";
import { Button, Badge, Modal, useToast } from "@/src/components/ui";

interface LeadOperationsClientProps {
  bootstrapData: LeadOperationsBootstrapData;
}

export function LeadOperationsClient({ bootstrapData }: LeadOperationsClientProps) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  // Section 1: "Leads From" filters
  const [profileId, setProfileId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [leadResponse, setLeadResponse] = useState<string>("");
  const [numberOfLeads, setNumberOfLeads] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Checkbox Types: Fresh, Old, Free Trials, Clients, Disposed, Deleted, Un-alloted
  const [selectedTypes, setSelectedTypes] = useState<Record<LeadTypeKey, boolean>>({
    FRESH: false,
    OLD: false,
    TRIALS: false,
    CLIENTS: false,
    DISPOSED: false,
    DELETED: false,
    UNALLOTED: false,
  });

  // Section 2: "Operation"
  const [operation, setOperation] = useState<LeadOperationType>("TRANSFER");

  // Section 3: "Leads To"
  const [targetProfileId, setTargetProfileId] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [targetLeadSource, setTargetLeadSource] = useState<string>("");
  const [targetLeadResponse, setTargetLeadResponse] = useState<string>("");

  // Live match count state
  const [matchCount, setMatchCount] = useState<number>(0);
  const [totalMatching, setTotalMatching] = useState<number>(0);
  const [isCounting, setIsCounting] = useState<boolean>(true);

  // Destructive Confirmation Modals
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [confirmPermanentChecked, setConfirmPermanentChecked] = useState<boolean>(false);

  // Filter employees for "Leads From"
  const filteredFromEmployees = useMemo(() => {
    if (!profileId) return bootstrapData.employees;
    return bootstrapData.employees.filter((e) => e.employeeProfileId === profileId);
  }, [bootstrapData.employees, profileId]);

  // Filter employees for "Leads To"
  const filteredToEmployees = useMemo(() => {
    if (!targetProfileId) return bootstrapData.employees;
    return bootstrapData.employees.filter((e) => e.employeeProfileId === targetProfileId);
  }, [bootstrapData.employees, targetProfileId]);

  // Active types array
  const activeTypeKeys = useMemo(() => {
    return (Object.keys(selectedTypes) as LeadTypeKey[]).filter((k) => selectedTypes[k]);
  }, [selectedTypes]);

  // Debounced live preview counter
  useEffect(() => {
    let isCancelled = false;

    const timer = setTimeout(async () => {
      setIsCounting(true);
      try {
        const num = numberOfLeads ? parseInt(numberOfLeads, 10) : undefined;
        const res = await previewLeadOperationsMatchCountAction({
          profileId: profileId || null,
          employeeId: employeeId || null,
          leadSource: leadSource || null,
          leadResponse: leadResponse || null,
          numberOfLeads: !isNaN(num!) && (num ?? 0) > 0 ? num : null,
          datePreset: datePreset || null,
          startDate: startDate || null,
          endDate: endDate || null,
          types: activeTypeKeys,
        });

        if (!isCancelled) {
          if (res.success) {
            setTotalMatching(res.totalMatching);
            setMatchCount(res.effectiveCount);
          } else {
            setTotalMatching(0);
            setMatchCount(0);
          }
          setIsCounting(false);
        }
      } catch {
        if (!isCancelled) {
          setTotalMatching(0);
          setMatchCount(0);
          setIsCounting(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    profileId,
    employeeId,
    leadSource,
    leadResponse,
    numberOfLeads,
    datePreset,
    startDate,
    endDate,
    activeTypeKeys,
  ]);

  const toggleType = (key: LeadTypeKey) => {
    setSelectedTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Trigger CSV Download
  const downloadCsv = (data: LeadExportRow[]) => {
    if (!data || data.length === 0) return;
    const headers = [
      "Lead ID",
      "Name",
      "Mobile",
      "Email",
      "City",
      "State",
      "Status",
      "Lead Source",
      "Lead Response",
      "Assigned To",
      "Created At",
    ];

    const rows = data.map((d) => [
      d.id,
      `"${String(d.name || "").replace(/"/g, '""')}"`,
      d.mobile || "",
      d.email || "",
      d.city || "",
      d.state || "",
      d.status || "",
      d.leadSource || "",
      d.leadResponse || "",
      `"${String(d.assignedToName || "").replace(/"/g, '""')}"`,
      d.createdAt || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lead_operations_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Perform execution
  const executeOperation = () => {
    if (matchCount === 0) {
      toast?.error("No matching leads found to execute this operation.");
      return;
    }

    if (operation === "TRANSFER" && !targetUserId) {
      toast?.error("Please select a target Employee under 'Leads To'.");
      return;
    }

    startTransition(async () => {
      try {
        const num = numberOfLeads ? parseInt(numberOfLeads, 10) : undefined;
        const res = await executeLeadOperationAction({
          filters: {
            profileId: profileId || null,
            employeeId: employeeId || null,
            leadSource: leadSource || null,
            leadResponse: leadResponse || null,
            numberOfLeads: !isNaN(num!) && (num ?? 0) > 0 ? num : null,
            datePreset: datePreset || null,
            startDate: startDate || null,
            endDate: endDate || null,
            types: activeTypeKeys,
          },
          operation,
          targetProfileId: targetProfileId || null,
          targetUserId: targetUserId || null,
          targetLeadSource: targetLeadSource || null,
          targetLeadResponse: targetLeadResponse || null,
        });

        if (res.success) {
          if (operation === "EXPORT" && res.exportData) {
            downloadCsv(res.exportData);
          }
          toast?.success(res.message || "Operation completed successfully.");
          setIsConfirmOpen(false);
          setConfirmPermanentChecked(false);
          // Trigger recount
          setMatchCount(0);
          setTotalMatching(0);
        } else {
          toast?.error(res.error || "Failed to execute operation.");
        }
      } catch (err) {
        toast?.error(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    });
  };

  const handleExecuteClick = () => {
    if (operation === "DELETE" || operation === "PERMANENT_DELETE") {
      setIsConfirmOpen(true);
    } else {
      executeOperation();
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* Top Header matching leadOperation1.jpg */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)] uppercase">
            LEAD OPERATIONS
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Batch reassign, recycle, filter, dispose, delete, or export CRM leads across profiles.
          </p>
        </div>

        {/* Go Back button (coral / orange styled like screenshot) */}
        <Link
          href="/admin/settings/configuration"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f87171] hover:bg-[#ef4444] text-white text-xs font-semibold shadow-xs transition-all"
        >
          <CornerUpLeft className="size-3.5" />
          <span>Go Back</span>
        </Link>
      </div>

      {/* SECTION 1: Leads From Card */}
      <div className="bg-white dark:bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="bg-slate-50 dark:bg-muted/30 px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <span className="font-semibold text-xs sm:text-sm text-[var(--text)] tracking-wide">
            Leads From
          </span>
          <div className="flex items-center gap-2">
            {isCounting ? (
              <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Loader2 className="size-3 animate-spin text-[var(--brand)]" />
                <span>Checking pool...</span>
              </span>
            ) : (
              <Badge tone={matchCount > 0 ? "ok" : "warn"}>
                {matchCount} {matchCount === 1 ? "Lead" : "Leads"} Matching
                {numberOfLeads && totalMatching > matchCount ? ` (of ${totalMatching} in pool)` : ""}
              </Badge>
            )}
          </div>
        </div>

        <div className="divide-y divide-[var(--border)]/40 text-xs sm:text-sm">
          {/* Row 1: Profile */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center py-2.5 px-5">
            <label htmlFor="from-profile" className="font-medium text-[var(--text)]">
              Profile
            </label>
            <select
              id="from-profile"
              value={profileId}
              onChange={(e) => {
                setProfileId(e.target.value);
                setEmployeeId(""); // reset employee filter on profile change
              }}
              className="inp text-xs sm:text-sm py-1.5 px-3 w-full bg-white dark:bg-background"
            >
              <option value="">All Profile</option>
              {bootstrapData.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: Employee */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center py-2.5 px-5">
            <label htmlFor="from-employee" className="font-medium text-[var(--text)]">
              Employee
            </label>
            <select
              id="from-employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="inp text-xs sm:text-sm py-1.5 px-3 w-full bg-white dark:bg-background"
            >
              <option value="">All Employee</option>
              <option value="UNALLOTED">-- Unalloted Pool Only --</option>
              {filteredFromEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.profileName ? `(${e.profileName})` : ""} {e.teamName ? `• ${e.teamName}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Row 3: Lead Source */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center py-2.5 px-5">
            <label htmlFor="from-source" className="font-medium text-[var(--text)]">
              Lead Source
            </label>
            <select
              id="from-source"
              value={leadSource}
              onChange={(e) => setLeadSource(e.target.value)}
              className="inp text-xs sm:text-sm py-1.5 px-3 w-full bg-white dark:bg-background"
            >
              <option value="">All Source</option>
              {bootstrapData.leadSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Row 4: Lead Response */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center py-2.5 px-5">
            <label htmlFor="from-response" className="font-medium text-[var(--text)]">
              Lead Response
            </label>
            <select
              id="from-response"
              value={leadResponse}
              onChange={(e) => setLeadResponse(e.target.value)}
              className="inp text-xs sm:text-sm py-1.5 px-3 w-full bg-white dark:bg-background"
            >
              <option value="">All Response</option>
              {bootstrapData.leadResponses.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Row 5: Number Of Leads */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center py-2.5 px-5">
            <label htmlFor="from-num" className="font-medium text-[var(--text)]">
              Number Of Leads
            </label>
            <input
              id="from-num"
              type="number"
              min="1"
              placeholder="e.g. 50 (leave empty for all matching)"
              value={numberOfLeads}
              onChange={(e) => setNumberOfLeads(e.target.value)}
              className="inp text-xs sm:text-sm py-1.5 px-3 w-full bg-white dark:bg-background"
            />
          </div>

          {/* Row 6: Date */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center py-2.5 px-5">
            <label htmlFor="from-date" className="font-medium text-[var(--text)]">
              Date
            </label>
            <div className="space-y-2">
              <select
                id="from-date"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="inp text-xs sm:text-sm py-1.5 px-3 w-full bg-white dark:bg-background"
              >
                <option value="">Select</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week (Last 7 Days)</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>

              {datePreset === "CUSTOM" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[11px] text-[var(--muted)] mb-1 block">Start Date:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="inp text-xs py-1.5 px-2.5 w-full bg-white dark:bg-background"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--muted)] mb-1 block">End Date:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="inp text-xs py-1.5 px-2.5 w-full bg-white dark:bg-background"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 7: Type Checkboxes (4 columns exactly matching screenshot) */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] py-3.5 px-5 items-start">
            <span className="font-medium text-[var(--text)] pt-0.5">Type</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4">
              {/* Column 1 */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text)] select-none">
                  <input
                    type="checkbox"
                    checked={selectedTypes.FRESH}
                    onChange={() => toggleType("FRESH")}
                    className="size-4 rounded border-[var(--border)] text-teal-600 focus:ring-teal-500/30 accent-teal-600"
                  />
                  <span>Fresh Leads</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text)] select-none">
                  <input
                    type="checkbox"
                    checked={selectedTypes.DISPOSED}
                    onChange={() => toggleType("DISPOSED")}
                    className="size-4 rounded border-[var(--border)] text-teal-600 focus:ring-teal-500/30 accent-teal-600"
                  />
                  <span>Disposed</span>
                </label>
              </div>

              {/* Column 2 */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text)] select-none">
                  <input
                    type="checkbox"
                    checked={selectedTypes.OLD}
                    onChange={() => toggleType("OLD")}
                    className="size-4 rounded border-[var(--border)] text-teal-600 focus:ring-teal-500/30 accent-teal-600"
                  />
                  <span>Old Leads</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text)] select-none">
                  <input
                    type="checkbox"
                    checked={selectedTypes.DELETED}
                    onChange={() => toggleType("DELETED")}
                    className="size-4 rounded border-[var(--border)] text-teal-600 focus:ring-teal-500/30 accent-teal-600"
                  />
                  <span>Deleted</span>
                </label>
              </div>

              {/* Column 3 */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text)] select-none">
                  <input
                    type="checkbox"
                    checked={selectedTypes.TRIALS}
                    onChange={() => toggleType("TRIALS")}
                    className="size-4 rounded border-[var(--border)] text-teal-600 focus:ring-teal-500/30 accent-teal-600"
                  />
                  <span>Free Trials</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text)] select-none">
                  <input
                    type="checkbox"
                    checked={selectedTypes.UNALLOTED}
                    onChange={() => toggleType("UNALLOTED")}
                    className="size-4 rounded border-[var(--border)] text-teal-600 focus:ring-teal-500/30 accent-teal-600"
                  />
                  <span>Un-alloted</span>
                </label>
              </div>

              {/* Column 4 */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text)] select-none">
                  <input
                    type="checkbox"
                    checked={selectedTypes.CLIENTS}
                    onChange={() => toggleType("CLIENTS")}
                    className="size-4 rounded border-[var(--border)] text-teal-600 focus:ring-teal-500/30 accent-teal-600"
                  />
                  <span>Clients</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Operation Card matching screenshot */}
      <div className="bg-white dark:bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="bg-slate-50 dark:bg-muted/30 px-5 py-3 border-b border-[var(--border)]">
          <span className="font-semibold text-xs sm:text-sm text-[var(--text)] tracking-wide">
            Operation
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-6 sm:gap-10 flex-wrap text-xs sm:text-sm">
            {[
              { id: "TRANSFER", label: "Transfer" },
              { id: "DISPOSE", label: "Dispose" },
              { id: "DELETE", label: "Delete" },
              { id: "PERMANENT_DELETE", label: "Permanent Delete" },
              { id: "UNALLOT", label: "Un-allot" },
              { id: "EXPORT", label: "Export" },
            ].map((op) => (
              <label
                key={op.id}
                className="inline-flex items-center gap-2 cursor-pointer font-medium text-[var(--text)] select-none hover:text-[var(--brand)] transition-colors"
              >
                <input
                  type="radio"
                  name="lead-operation"
                  value={op.id}
                  checked={operation === op.id}
                  onChange={() => setOperation(op.id as LeadOperationType)}
                  className="size-4 text-teal-600 focus:ring-teal-500/30 accent-teal-600"
                />
                <span>{op.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: Leads To Card matching screenshot */}
      <div
        className={`bg-white dark:bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-xs overflow-hidden transition-opacity ${
          operation !== "TRANSFER" ? "opacity-55 pointer-events-none select-none" : ""
        }`}
      >
        <div className="bg-slate-50 dark:bg-muted/30 px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <span className="font-semibold text-xs sm:text-sm text-[var(--text)] tracking-wide">
            Leads To
          </span>
          {operation !== "TRANSFER" && (
            <span className="text-[11px] text-[var(--muted)] font-normal italic">
              (Only active for Transfer operation)
            </span>
          )}
        </div>

        <div className="divide-y divide-[var(--border)]/40 text-xs sm:text-sm">
          {/* Row 1: Profile */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center py-2.5 px-5">
            <label htmlFor="to-profile" className="font-medium text-[var(--text)]">
              Profile
            </label>
            <select
              id="to-profile"
              value={targetProfileId}
              disabled={operation !== "TRANSFER"}
              onChange={(e) => {
                setTargetProfileId(e.target.value);
                setTargetUserId("");
              }}
              className="inp text-xs sm:text-sm py-1.5 px-3 w-full bg-white dark:bg-background"
            >
              <option value="">Profile</option>
              {bootstrapData.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: Employee */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center py-2.5 px-5">
            <label htmlFor="to-employee" className="font-medium text-[var(--text)]">
              Employee
            </label>
            <select
              id="to-employee"
              value={targetUserId}
              disabled={operation !== "TRANSFER"}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="inp text-xs sm:text-sm py-1.5 px-3 w-full bg-white dark:bg-background"
            >
              <option value="">Change Employee</option>
              {filteredToEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.profileName ? `(${e.profileName})` : ""} {e.teamName ? `• ${e.teamName}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Row 3: Lead Source */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center py-2.5 px-5">
            <label htmlFor="to-source" className="font-medium text-[var(--text)]">
              Lead Source
            </label>
            <select
              id="to-source"
              value={targetLeadSource}
              disabled={operation !== "TRANSFER"}
              onChange={(e) => setTargetLeadSource(e.target.value)}
              className="inp text-xs sm:text-sm py-1.5 px-3 w-full bg-white dark:bg-background"
            >
              <option value="">Change Source</option>
              {bootstrapData.leadSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Row 4: Lead Response */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center py-2.5 px-5">
            <label htmlFor="to-response" className="font-medium text-[var(--text)]">
              Lead Response
            </label>
            <select
              id="to-response"
              value={targetLeadResponse}
              disabled={operation !== "TRANSFER"}
              onChange={(e) => setTargetLeadResponse(e.target.value)}
              className="inp text-xs sm:text-sm py-1.5 px-3 w-full bg-white dark:bg-background"
            >
              <option value="">Change Response</option>
              {bootstrapData.leadResponses.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Action Area: Centered Execute Button matching screenshot */}
      <div className="flex flex-col items-center justify-center pt-2 space-y-3">
        <button
          type="button"
          onClick={handleExecuteClick}
          disabled={isPending || matchCount === 0 || (operation === "TRANSFER" && !targetUserId)}
          className={`px-8 py-2.5 rounded-lg text-white font-semibold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
            isPending || matchCount === 0 || (operation === "TRANSFER" && !targetUserId)
              ? "bg-[#00d2d3]/50 cursor-not-allowed opacity-60"
              : "bg-[#00d2d3] hover:bg-[#00bec0] active:scale-[0.98] cursor-pointer"
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Executing...</span>
            </>
          ) : operation === "EXPORT" ? (
            <>
              <Download className="size-4" />
              <span>Execute Export ({matchCount})</span>
            </>
          ) : (
            <span>Execute ({matchCount})</span>
          )}
        </button>

        {/* Footer info text */}
        <div className="text-center text-xs text-[var(--muted)] pt-6">
          © Stock Emphasis v4.2.0. All rights reserved.
        </div>
      </div>

      {/* Destructive Confirmation Modal for Delete and Permanent Delete */}
      <Modal
        open={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setConfirmPermanentChecked(false);
        }}
        size="md"
        title={
          <div className="flex items-center gap-2 text-rose-500 font-bold">
            <AlertTriangle className="size-5 shrink-0" />
            <span>
              {operation === "PERMANENT_DELETE"
                ? "Confirm Permanent Lead Deletion"
                : "Confirm Move to Deleted Bin"}
            </span>
          </div>
        }
        description={`You are about to execute ${
          operation === "PERMANENT_DELETE" ? "Permanent Deletion" : "Soft Delete"
        } on ${matchCount} matching lead(s).`}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsConfirmOpen(false);
                setConfirmPermanentChecked(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isPending}
              disabled={isPending || (operation === "PERMANENT_DELETE" && !confirmPermanentChecked)}
              onClick={executeOperation}
            >
              {operation === "PERMANENT_DELETE" ? "Delete Permanently" : "Move to Deleted"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          {operation === "PERMANENT_DELETE" ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1 text-rose-600 dark:text-rose-300">
                  <ShieldAlert className="size-4" /> Warning: Irreversible Action
                </p>
                This will permanently purge <strong>{matchCount}</strong> lead(s) along with their call logs
                and trial/payment connections from the database. This action CANNOT be recovered.
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-600 dark:text-rose-400 select-none pt-1">
                <input
                  type="checkbox"
                  checked={confirmPermanentChecked}
                  onChange={(e) => setConfirmPermanentChecked(e.target.checked)}
                  className="size-4 rounded border-rose-500 text-rose-600 focus:ring-rose-500/30"
                />
                <span>I understand this is permanent and cannot be undone</span>
              </label>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 leading-relaxed">
              These <strong>{matchCount}</strong> lead(s) will be unassigned and moved to the Deleted Bin
              (status: <code className="font-mono">DELETED</code>). They can still be reviewed by Admins in
              the Deleted tab.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
