"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, Layers } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type {
  FetchLimitRuleItem,
  ProfileRef,
  EmployeeRef,
  CreateFetchLimitInput,
  UpdateFetchLimitInput,
} from "./types";
import {
  Modal,
  Button,
  Badge,
  Field,
  Input,
  Select,
  Icon,
} from "@/src/components/ui";

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
  const isEdit = Boolean(initialRule);

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
    initialRule ? initialRule.leadSource : ""
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

  // Filter employees and managers: active managers are always eligible; employees match selected profiles
  const eligibleEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (e.role === "MANAGER") return true;
      return (
        selectedProfileIds.length > 0 &&
        e.employeeProfileId &&
        selectedProfileIds.includes(e.employeeProfileId)
      );
    });
  }, [employees, selectedProfileIds]);

  if (!isOpen) return null;

  // Toggle profile badge selection and clean up employee selections synchronously in the event handler
  const handleToggleProfile = (profileId: string) => {
    const nextProfiles = selectedProfileIds.includes(profileId)
      ? selectedProfileIds.filter((id) => id !== profileId)
      : [...selectedProfileIds, profileId];

    setSelectedProfileIds(nextProfiles);

    // Keep selected users who are managers OR whose profile is still selected
    setSelectedEmployeeIds((prev) =>
      prev.filter((id) => {
        const emp = employees.find((e) => e.id === id);
        if (emp?.role === "MANAGER") return true;
        return (
          emp?.employeeProfileId &&
          nextProfiles.includes(emp.employeeProfileId)
        );
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
    if (!leadSource) {
      setErrorMsg("Please select a Lead Source.");
      return;
    }
    if (selectedProfileIds.length === 0 && selectedEmployeeIds.length === 0) {
      setErrorMsg(
        "Please select at least one Profile or assign at least one Employee/Manager."
      );
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
          resetUsageForUserIds: resetUsage
            ? initialRule.usages.map((u) => u.userId)
            : undefined,
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
      setErrorMsg(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-[var(--brand)]" />
          <span>{isEdit ? "Edit Fetch Limit" : "Add Fetch Limit"}</span>
        </div>
      }
      description="Configure profile thresholds, single-request lead limits, and request quotas."
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button
            type="submit"
            form="fetch-limit-form"
            variant="primary"
            size="sm"
            loading={isSubmitting}
            leftIcon="Check"
            loadingText="Saving..."
          >
            Save
          </Button>
        </div>
      }
    >
      <form id="fetch-limit-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-[var(--err-tint)] border border-[var(--err-border)] flex items-start gap-2.5 text-xs text-[var(--err)]">
            <Icon name="TriangleAlert" size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Available Limit */}
          <Field
            label="Available Limit"
            required
            description="Threshold remaining leads when employee can request more."
          >
            <Input
              type="number"
              min="0"
              step="1"
              value={availableLimit}
              onChange={(e) => setAvailableLimit(e.target.value)}
              placeholder="e.g. 3"
              required
            />
          </Field>

          {/* Fetch Limit */}
          <Field
            label="Fetch Limit"
            required
            description="Maximum leads returned per single request."
          >
            <Input
              type="number"
              min="1"
              step="1"
              value={fetchLimit}
              onChange={(e) => setFetchLimit(e.target.value)}
              placeholder="e.g. 10"
              required
            />
          </Field>

          {/* Fetch Count (Configured Max Requests) */}
          <Field
            label="Fetch Count"
            required
            description="Maximum allowed successful requests before quota exhaustion."
          >
            <Input
              type="number"
              min="1"
              step="1"
              value={fetchCount}
              onChange={(e) => setFetchCount(e.target.value)}
              placeholder="e.g. 60"
              required
            />
          </Field>

          {/* Lead Source */}
          <Field
            label="Lead Source"
            required
            description="Canonical lead source pool to draw leads from."
          >
            <Select
              value={leadSource}
              onChange={(e) => setLeadSource(e.target.value)}
            >
              {leadSources.length === 0 ? (
                <option value="">No sources configured in Settings</option>
              ) : (
                <>
                  <option value="">-- Select Source --</option>
                  {!leadSources.includes(leadSource) && leadSource && (
                    <option value={leadSource}>{leadSource} (Existing)</option>
                  )}
                  {leadSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </>
              )}
            </Select>
          </Field>
        </div>

        {/* Profile Multi-Select Badges */}
        <div className="space-y-2 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
              <Layers className="size-3.5 text-[var(--brand)]" />
              <span>
                Employee Profiles <span className="text-[var(--err)]">*</span>
              </span>
            </label>
            <span className="text-[11px] text-[var(--muted)]">
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
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                    isSelected
                      ? "bg-[var(--brand)] text-white shadow-xs ring-2 ring-[var(--brand-border)]"
                      : "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--subtle)] border border-[var(--border)]"
                  )}
                >
                  <span>{p.name}</span>
                  {isSelected ? (
                    <Icon name="X" size={14} className="stroke-[2.5]" />
                  ) : (
                    <span className="text-[var(--muted)]">+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Employee & Manager Selection Checklist */}
        <div className="space-y-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
              <Icon name="Users" size={14} className="text-[var(--brand)]" />
              <span>Employees &amp; Managers Selection</span>
              <span className="text-[11px] text-[var(--muted)] font-normal">
                ({selectedEmployeeIds.length} of {eligibleEmployees.length}{" "}
                selected)
              </span>
            </label>

            {eligibleEmployees.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAllEmployees}
                className="text-[11px] font-semibold text-[var(--brand)] hover:underline cursor-pointer"
              >
                {isAllEligibleSelected ? "Clear All" : "Select All"}
              </button>
            )}
          </div>

          {eligibleEmployees.length === 0 ? (
            <div className="p-4 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-center text-xs text-[var(--muted)]">
              Please select an Employee Profile above to view eligible staff, or
              active Managers will appear automatically.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto p-3 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {eligibleEmployees.map((emp) => {
                const isChecked = selectedEmployeeIds.includes(emp.id);
                const isManager = emp.role === "MANAGER";
                return (
                  <label
                    key={emp.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border transition-colors",
                      isChecked
                        ? "bg-[var(--brand-tint)] border-[var(--brand-border)] text-[var(--text)] font-medium"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:bg-[var(--subtle)]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleEmployee(emp.id)}
                      className="size-3.5 rounded text-[var(--brand)] focus:ring-[var(--brand)]"
                    />
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{emp.name}</span>
                        {isManager && (
                          <Badge
                            tone="info"
                            className="text-[9px] px-1.5 py-0"
                          >
                            Manager
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] truncate">
                        {isManager
                          ? "Manager"
                          : emp.employeeProfileName || "No Profile"}
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
          <div className="p-3.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold text-[var(--text)]">
              <span className="flex items-center gap-1.5">
                <Icon
                  name="RefreshCw"
                  size={14}
                  className="text-[var(--brand)]"
                />
                <span>Current Request Usage</span>
              </span>
              <span className="text-[var(--muted)] font-normal">
                {initialRule.totalFetchesUsed} / {initialRule.fetchCount}{" "}
                requests used
              </span>
            </div>
            <label className="flex items-center gap-2 pt-1 text-[var(--muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={resetUsage}
                onChange={(e) => setResetUsage(e.target.checked)}
                className="size-3.5 rounded text-[var(--brand)] focus:ring-[var(--brand)]"
              />
              <span>
                Reset request usage counter to 0 upon saving (preserves audit
                logs)
              </span>
            </label>
          </div>
        )}
      </form>
    </Modal>
  );
}
