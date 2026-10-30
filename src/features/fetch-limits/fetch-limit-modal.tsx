"use client";

import { useState, useMemo } from "react";
import { X, Check, AlertCircle, RefreshCw, Layers, Users, Sliders } from "lucide-react";
import type {
  FetchLimitRuleItem,
  ProfileRef,
  EmployeeRef,
  CreateFetchLimitInput,
  UpdateFetchLimitInput,
} from "./types";

interface FetchLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    input: CreateFetchLimitInput | UpdateFetchLimitInput
  ) => Promise<{ success: boolean; error?: string }>;
  initialRule?: FetchLimitRuleItem | null;
  profiles: ProfileRef[];
  employees: EmployeeRef[];
  leadSources: readonly string[];
}

export function FetchLimitModal({
  isOpen,
  onClose,
  onSave,
  initialRule,
  profiles,
  employees,
  leadSources,
}: FetchLimitModalProps) {
  const isEdit = !!initialRule;

  // Form State initialized directly from props
  const [availableLimit, setAvailableLimit] = useState<string>(
    initialRule ? String(initialRule.availableLimit) : "3"
  );
  const [fetchLimit, setFetchLimit] = useState<string>(
    initialRule ? String(initialRule.fetchLimit) : "10"
  );
  const [fetchCount, setFetchCount] = useState<string>(
    initialRule ? String(initialRule.fetchCount) : "60"
  );
  const [leadSource, setLeadSource] = useState<string>(
    initialRule ? initialRule.leadSource : leadSources[0] || "Premium Lead"
  );
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>(
    () => initialRule?.profiles.map((p) => p.id) || []
  );
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    () => initialRule?.assignedUsers.map((u) => u.id) || []
  );
  const [resetUsage, setResetUsage] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter employees belonging to the currently selected profiles
  const eligibleEmployees = useMemo(() => {
    if (selectedProfileIds.length === 0) return [];
    return employees.filter(
      (e) => e.employeeProfileId && selectedProfileIds.includes(e.employeeProfileId)
    );
  }, [employees, selectedProfileIds]);

  if (!isOpen) return null;

  // Toggle profile badge selection and clean up employee selections synchronously in the event handler
  const handleToggleProfile = (profileId: string) => {
    const nextProfiles = selectedProfileIds.includes(profileId)
      ? selectedProfileIds.filter((id) => id !== profileId)
      : [...selectedProfileIds, profileId];

    setSelectedProfileIds(nextProfiles);

    // Keep only selected employees whose profile is still selected
    setSelectedEmployeeIds((prev) =>
      prev.filter((id) => {
        const emp = employees.find((e) => e.id === id);
        return emp?.employeeProfileId && nextProfiles.includes(emp.employeeProfileId);
      })
    );
  };

  // Toggle individual employee selection
  const handleToggleEmployee = (empId: string) => {
    setSelectedEmployeeIds((prev) => {
      const exists = prev.includes(empId);
      if (exists) {
        return prev.filter((id) => id !== empId);
      } else {
        return [...prev, empId];
      }
    });
  };

  // Select all or clear all eligible employees
  const isAllEligibleSelected =
    eligibleEmployees.length > 0 &&
    eligibleEmployees.every((e) => selectedEmployeeIds.includes(e.id));

  const handleToggleSelectAllEmployees = () => {
    if (isAllEligibleSelected) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(eligibleEmployees.map((e) => e.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAvailable = parseInt(availableLimit, 10);
    const parsedFetchLimit = parseInt(fetchLimit, 10);
    const parsedFetchCount = parseInt(fetchCount, 10);

    if (isNaN(parsedAvailable) || parsedAvailable < 0) {
      setErrorMsg("Available Limit must be 0 or a positive integer.");
      return;
    }
    if (isNaN(parsedFetchLimit) || parsedFetchLimit <= 0) {
      setErrorMsg("Fetch Limit must be greater than 0.");
      return;
    }
    if (isNaN(parsedFetchCount) || parsedFetchCount <= 0) {
      setErrorMsg("Fetch Count must be greater than 0.");
      return;
    }
    if (selectedProfileIds.length === 0) {
      setErrorMsg("Please select at least one Employee Profile.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && initialRule) {
        const payload: UpdateFetchLimitInput = {
          ruleId: initialRule.id,
          availableLimit: parsedAvailable,
          fetchLimit: parsedFetchLimit,
          fetchCount: parsedFetchCount,
          leadSource,
          profileIds: selectedProfileIds,
          assignedUserIds: selectedEmployeeIds,
          resetUsageForUserIds: resetUsage ? initialRule.usages.map((u) => u.userId) : undefined,
        };
        const res = await onSave(payload);
        if (!res.success) {
          setErrorMsg(res.error || "Failed to update fetch limit.");
        } else {
          onClose();
        }
      } else {
        const payload: CreateFetchLimitInput = {
          availableLimit: parsedAvailable,
          fetchLimit: parsedFetchLimit,
          fetchCount: parsedFetchCount,
          leadSource,
          profileIds: selectedProfileIds,
          assignedUserIds: selectedEmployeeIds,
        };
        const res = await onSave(payload);
        if (!res.success) {
          setErrorMsg(res.error || "Failed to create fetch limit.");
        } else {
          onClose();
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0c1322] border border-slate-200/90 dark:border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.25)] p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="size-5 text-blue-600 dark:text-blue-400" />
              <span>{isEdit ? "Edit Fetch Limit" : "Add Fetch Limit"}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure profile thresholds, single-request lead limits, and request quotas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Available Limit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Available Limit <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={availableLimit}
                onChange={(e) => setAvailableLimit(e.target.value)}
                placeholder="e.g. 3"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Threshold remaining leads when employee can request more.
              </p>
            </div>

            {/* Fetch Limit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Fetch Limit <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={fetchLimit}
                onChange={(e) => setFetchLimit(e.target.value)}
                placeholder="e.g. 10"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Maximum leads returned per single request.
              </p>
            </div>

            {/* Fetch Count (Configured Max Requests) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Fetch Count <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={fetchCount}
                onChange={(e) => setFetchCount(e.target.value)}
                placeholder="e.g. 60"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Maximum allowed successful requests before quota exhaustion.
              </p>
            </div>

            {/* Lead Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lead Source <span className="text-rose-500">*</span>
              </label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {leadSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Canonical lead source pool to draw leads from.
              </p>
            </div>
          </div>

          {/* Profile Multi-Select Badges */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="size-3.5 text-blue-500" />
                <span>Employee Profiles <span className="text-rose-500">*</span></span>
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedProfileIds.length} profile(s) selected
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {profiles.map((p) => {
                const isSelected = selectedProfileIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleToggleProfile(p.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-500/30"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-250 dark:border-white/[0.08]"
                    }`}
                  >
                    <span>{p.name}</span>
                    {isSelected ? (
                      <X className="size-3.5 stroke-[2.5]" />
                    ) : (
                      <span className="text-slate-400">+</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Employee Selection Checklist (Filtered by Selected Profiles) */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="size-3.5 text-indigo-500" />
                <span>Employees Selection</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  ({selectedEmployeeIds.length} of {eligibleEmployees.length} selected)
                </span>
              </label>

              {eligibleEmployees.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAllEmployees}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {isAllEligibleSelected ? "Clear All" : "Select All"}
                </button>
              )}
            </div>

            {selectedProfileIds.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/[0.06] text-center text-xs text-slate-400">
                Please select at least one Employee Profile above to view eligible staff members.
              </div>
            ) : eligibleEmployees.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center text-xs text-amber-600 dark:text-amber-400">
                No active employees are currently assigned to the selected profiles.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {eligibleEmployees.map((emp) => {
                  const isChecked = selectedEmployeeIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                        isChecked
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 font-medium"
                          : "bg-white dark:bg-slate-800/40 border-slate-200/60 dark:border-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-slate-100/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleEmployee(emp.id)}
                        className="size-3.5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0 truncate">
                        <div className="truncate">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {emp.employeeProfileName || "No Profile"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Edit Mode: Usage Counter & Reset Option */}
          {isEdit && initialRule && initialRule.usages.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/[0.06] space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="size-3.5 text-blue-500" />
                  <span>Current Request Usage</span>
                </span>
                <span className="text-slate-500 font-normal">
                  {initialRule.totalFetchesUsed} / {initialRule.fetchCount} requests used
                </span>
              </div>
              <label className="flex items-center gap-2 pt-1 text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetUsage}
                  onChange={(e) => setResetUsage(e.target.checked)}
                  className="size-3.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Reset request usage counter to 0 upon saving (preserves audit logs)</span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5 stroke-[2.5]" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
