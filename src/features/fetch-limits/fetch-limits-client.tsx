"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sliders,
  Plus,
  ArrowLeft,
  Search,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { FetchLimitModal } from "./fetch-limit-modal";
import {
  createFetchLimitRuleAction,
  updateFetchLimitRuleAction,
  deleteFetchLimitRuleAction,
  resetFetchCountUsageAction,
} from "./actions";
import type {
  FetchLimitRuleItem,
  ProfileRef,
  EmployeeRef,
  CreateFetchLimitInput,
  UpdateFetchLimitInput,
} from "./types";

interface FetchLimitsClientProps {
  initialRules: FetchLimitRuleItem[];
  profiles: ProfileRef[];
  employees: EmployeeRef[];
  leadSources: readonly string[];
}

export function FetchLimitsClient({
  initialRules,
  profiles,
  employees,
  leadSources,
}: FetchLimitsClientProps) {
  const [rules, setRules] = useState<FetchLimitRuleItem[]>(initialRules);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FetchLimitRuleItem | null>(null);

  // Delete Confirmation State
  const [deletingRule, setDeletingRule] = useState<FetchLimitRuleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset Usage Confirmation State
  const [resettingRule, setResettingRule] = useState<FetchLimitRuleItem | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Notification Toast State
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Filter rules by search & source
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchSource = sourceFilter === "ALL" || rule.leadSource === sourceFilter;
      if (!matchSource) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const inSource = rule.leadSource.toLowerCase().includes(q);
      const inProfiles = rule.profiles.some((p) => p.name.toLowerCase().includes(q));
      const inUsers = rule.assignedUsers.some(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.username && u.username.toLowerCase().includes(q))
      );
      const inAdmin = rule.createdByName.toLowerCase().includes(q);

      return inSource || inProfiles || inUsers || inAdmin;
    });
  }, [rules, searchQuery, sourceFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rule: FetchLimitRuleItem) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  // Handle Save (Add / Edit)
  const handleSaveRule = async (
    input: CreateFetchLimitInput | UpdateFetchLimitInput
  ): Promise<{ success: boolean; error?: string }> => {
    if ("ruleId" in input) {
      // Update
      const res = await updateFetchLimitRuleAction(input);
      if (res.success) {
        showToast("success", "Fetch Limit configuration updated successfully.");
        // Optimistically update
        setRules((prev) =>
          prev.map((r) => {
            if (r.id !== input.ruleId) return r;
            const updatedProfiles = profiles.filter((p) => input.profileIds.includes(p.id));
            const updatedAssigned = employees.filter((e) =>
              (input.assignedUserIds || []).includes(e.id)
            );
            return {
              ...r,
              availableLimit: input.availableLimit,
              fetchLimit: input.fetchLimit,
              fetchCount: input.fetchCount,
              leadSource: input.leadSource,
              profiles: updatedProfiles,
              assignedUsers: updatedAssigned,
              totalFetchesUsed: input.resetUsageForUserIds ? 0 : r.totalFetchesUsed,
            };
          })
        );
      }
      return res;
    } else {
      // Create
      const res = await createFetchLimitRuleAction(input);
      if (res.success && res.ruleId) {
        showToast("success", "Fetch Limit configuration created successfully.");
        const updatedProfiles = profiles.filter((p) => input.profileIds.includes(p.id));
        const updatedAssigned = employees.filter((e) =>
          (input.assignedUserIds || []).includes(e.id)
        );
        const newRule: FetchLimitRuleItem = {
          id: res.ruleId,
          availableLimit: input.availableLimit,
          fetchLimit: input.fetchLimit,
          fetchCount: input.fetchCount,
          leadSource: input.leadSource,
          createdById: "current-admin",
          createdByName: "Admin",
          createdByEmail: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profiles: updatedProfiles,
          assignedUsers: updatedAssigned,
          usages: [],
          totalFetchesUsed: 0,
        };
        setRules((prev) => [newRule, ...prev]);
      }
      return res;
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingRule) return;
    setIsDeleting(true);
    try {
      const res = await deleteFetchLimitRuleAction(deletingRule.id);
      if (res.success) {
        setRules((prev) => prev.filter((r) => r.id !== deletingRule.id));
        showToast("success", `Rule for "${deletingRule.leadSource}" deleted successfully.`);
        setDeletingRule(null);
      } else {
        showToast("error", res.error || "Failed to delete rule.");
      }
    } catch {
      showToast("error", "An error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Reset Usage Confirmation
  const handleConfirmResetUsage = async () => {
    if (!resettingRule) return;
    setIsResetting(true);
    try {
      const res = await resetFetchCountUsageAction(resettingRule.id);
      if (res.success) {
        setRules((prev) =>
          prev.map((r) =>
            r.id === resettingRule.id
              ? {
                  ...r,
                  totalFetchesUsed: 0,
                  usages: r.usages.map((u) => ({ ...u, successfulFetches: 0 })),
                }
              : r
          )
        );
        showToast("success", `Request usage counter for "${resettingRule.leadSource}" was reset to 0.`);
        setResettingRule(null);
      } else {
        showToast("error", res.error || "Failed to reset usage.");
      }
    } catch {
      showToast("error", "An error occurred while resetting usage.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-300 ${
            toastMsg.type === "success"
              ? "bg-emerald-600 text-white shadow-emerald-500/20"
              : "bg-rose-600 text-white shadow-rose-500/20"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400">
              Admin Governance
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
              {rules.length} Rules Active
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Fetch Limit Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Configure employee lead self-fetch thresholds, single-request lead limits, and total request quotas by Profile and Lead Source.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="size-4" />
            <span>Go Back</span>
          </Link>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Add Fetch Limit</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-[#0c1322]/50 border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by lead source, profile, employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/[0.06] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="size-3.5 text-slate-400 shrink-0" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/[0.06] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Sources ({rules.length})</option>
            {leadSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fetch Limit Rules Table */}
      <div className="overflow-hidden rounded-3xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-white/[0.08] bg-slate-50/75 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 pl-6 pr-3 w-12 text-center">#</th>
                <th className="py-3.5 px-4 min-w-[280px]">Employee / Profiles</th>
                <th className="py-3.5 px-4 text-center">Available Limit</th>
                <th className="py-3.5 px-4 text-center">Fetch Limit</th>
                <th className="py-3.5 px-4 text-center">Fetch Count (Quota)</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Added By</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Sliders className="size-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                      No fetch limit rules found.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery || sourceFilter !== "ALL"
                        ? "Try adjusting your search query or filter."
                        : "Click '+ Add Fetch Limit' above to create your first configuration."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule, idx) => {
                  // Group assigned users under their respective profiles (matching the screenshot layout!)
                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* # Row Index */}
                      <td className="py-4 pl-6 pr-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* Employee Profiles and Indented Users */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-3">
                          {rule.profiles.map((p) => {
                            // Find assigned users that belong to this profile
                            const usersInProfile = rule.assignedUsers.filter(
                              (u) => u.employeeProfileId === p.id
                            );

                            return (
                              <div key={p.id} className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200/60 dark:border-blue-900/40">
                                  <span>{p.name}</span>
                                  {usersInProfile.length > 0 && (
                                    <span className="text-[10px] text-blue-500 font-normal">
                                      ({usersInProfile.length})
                                    </span>
                                  )}
                                </div>

                                {usersInProfile.length > 0 && (
                                  <div className="pl-3.5 border-l-2 border-slate-200 dark:border-slate-800 space-y-0.5">
                                    {usersInProfile.map((u) => (
                                      <div
                                        key={u.id}
                                        className="text-[11px] text-slate-600 dark:text-slate-300 font-medium"
                                      >
                                        {u.name}
                                        {u.username && (
                                          <span className="text-[10px] text-slate-400 ml-1">
                                            (@{u.username})
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Fallback if users have no matching profile in rule */}
                          {rule.assignedUsers.filter(
                            (u) => !rule.profiles.some((p) => p.id === u.employeeProfileId)
                          ).length > 0 && (
                            <div className="space-y-0.5 pt-1">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                Other Staff:
                              </span>
                              <div className="pl-3.5 border-l-2 border-slate-200 dark:border-slate-800">
                                {rule.assignedUsers
                                  .filter(
                                    (u) => !rule.profiles.some((p) => p.id === u.employeeProfileId)
                                  )
                                  .map((u) => (
                                    <div
                                      key={u.id}
                                      className="text-[11px] text-slate-600 dark:text-slate-300"
                                    >
                                      {u.name}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Available Limit */}
                      <td className="py-4 px-4 text-center align-top">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-900/40">
                          ≤ {rule.availableLimit}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">leads threshold</div>
                      </td>

                      {/* Fetch Limit */}
                      <td className="py-4 px-4 text-center align-top">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-900/40">
                          {rule.fetchLimit}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">per request</div>
                      </td>

                      {/* Fetch Count (Configured Max & Usage) */}
                      <td className="py-4 px-4 text-center align-top">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-900/40">
                          {rule.fetchCount}
                        </span>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          {rule.totalFetchesUsed} request(s) used
                        </div>
                      </td>

                      {/* Lead Source */}
                      <td className="py-4 px-4 align-top">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 font-semibold border border-slate-200/60 dark:border-white/[0.08]">
                          {rule.leadSource}
                        </span>
                      </td>

                      {/* Added By */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {rule.createdByName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(rule.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 pl-4 pr-6 text-right align-top">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rule)}
                            title="Edit Fetch Limit"
                            className="p-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="size-3.5" />
                          </button>

                          {/* Reset Usage */}
                          <button
                            type="button"
                            onClick={() => setResettingRule(rule)}
                            title="Reset Fetch Request Counter (keeps audit history)"
                            className="p-1.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="size-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeletingRule(rule)}
                            title="Delete Fetch Limit Rule"
                            className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <FetchLimitModal
          key={editingRule?.id || "new"}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRule}
          initialRule={editingRule}
          profiles={profiles}
          employees={employees}
          leadSources={leadSources}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c1322] border border-rose-200/80 dark:border-rose-900/40 shadow-2xl p-6 space-y-4">
            <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="size-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Fetch Limit Rule?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to delete the fetch limit rule for{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {deletingRule.leadSource}
                </strong>{" "}
                (Profiles: {deletingRule.profiles.map((p) => p.name).join(", ")})?
                <br />
                Historical fetch logs and lead allotments will remain preserved.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setDeletingRule(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-250 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Usage Confirmation Dialog */}
      {resettingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c1322] border border-amber-200/80 dark:border-amber-900/40 shadow-2xl p-6 space-y-4">
            <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <RefreshCw className="size-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reset Request Usage Counter?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will reset the successful fetch request counter back to 0 for all employees under this rule (
                <strong className="text-slate-800 dark:text-slate-200">
                  {resettingRule.leadSource}
                </strong>
                ).
                <br />
                Employees who reached their {resettingRule.fetchCount} request limit will be able to fetch leads again.
                All historical fetch audit records are safely preserved.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setResettingRule(null)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl border border-slate-250 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetUsage}
                disabled={isResetting}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isResetting ? "Resetting..." : "Reset Counter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

