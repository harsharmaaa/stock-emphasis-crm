"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sliders, Filter } from "lucide-react";
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
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Input,
  Select,
  EmptyState,
  ConfirmDialog,
  Icon,
  useToast,
} from "@/src/components/ui";

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
  const toast = useToast();
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
        toast.success("Fetch Limit configuration updated successfully.");
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
        toast.success("Fetch Limit configuration created successfully.");
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
        toast.success(`Rule for "${deletingRule.leadSource}" deleted successfully.`);
        setDeletingRule(null);
      } else {
        toast.error(res.error || "Failed to delete rule.");
      }
    } catch {
      toast.error("An error occurred while deleting.");
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
        toast.success(`Request usage counter for "${resettingRule.leadSource}" was reset to 0.`);
        setResettingRule(null);
      } else {
        toast.error(res.error || "Failed to reset usage.");
      }
    } catch {
      toast.error("An error occurred while resetting usage.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Actions */}
      <PageHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Fetch Limits" },
        ]}
        title={
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-[var(--brand-tint)] flex items-center justify-center text-[var(--brand)]">
              <Sliders className="size-5" />
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span>Fetch Limit Management</span>
              <Badge tone="info" className="text-[10px] font-mono">
                {rules.length} Rules Active
              </Badge>
            </div>
          </div>
        }
        description="Configure employee lead self-fetch thresholds, single-request lead limits, and total request quotas by Profile and Lead Source."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/settings">
              <Button variant="outline" size="sm" leftIcon="ChevronLeft">
                Go Back
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              leftIcon="Plus"
              onClick={handleOpenAdd}
            >
              Add Fetch Limit
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
              <Icon name="Search" size={16} />
            </div>
            <Input
              type="text"
              placeholder="Search by lead source, profile, employee name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9"
            />
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="text-[var(--muted)] shrink-0">
              <Filter className="size-4" />
            </div>
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full sm:w-48"
            >
              <option value="ALL">All Sources ({rules.length})</option>
              {leadSources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Fetch Limit Rules Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--subtle)] text-[var(--muted)] font-semibold uppercase tracking-wider text-[10px]">
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
            <tbody className="divide-y divide-[var(--border)]">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      icon="SlidersHorizontal"
                      title="No fetch limit rules found"
                      description={
                        searchQuery || sourceFilter !== "ALL"
                          ? "Try adjusting your search query or filter."
                          : "Click '+ Add Fetch Limit' above to create your first configuration."
                      }
                      actionLabel={!searchQuery && sourceFilter === "ALL" ? "Add Fetch Limit" : undefined}
                      onAction={handleOpenAdd}
                      className="border-0 shadow-none bg-transparent"
                    />
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule, idx) => {
                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-[var(--subtle)] transition-colors"
                    >
                      {/* # Row Index */}
                      <td className="py-4 pl-6 pr-3 text-center text-[var(--muted)] font-mono">
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
                                <Badge tone="info" className="font-bold text-[11px]">
                                  <span>{p.name}</span>
                                  {usersInProfile.length > 0 && (
                                    <span className="text-[10px] opacity-80 font-normal ml-1">
                                      ({usersInProfile.length})
                                    </span>
                                  )}
                                </Badge>

                                {usersInProfile.length > 0 && (
                                  <div className="pl-3.5 border-l-2 border-[var(--border)] space-y-0.5">
                                    {usersInProfile.map((u) => (
                                      <div
                                        key={u.id}
                                        className="text-[11px] text-[var(--text)] font-medium"
                                      >
                                        {u.name}
                                        {u.username && (
                                          <span className="text-[10px] text-[var(--muted)] ml-1">
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
                              <span className="text-[10px] text-[var(--muted)] uppercase font-semibold">
                                Other Staff:
                              </span>
                              <div className="pl-3.5 border-l-2 border-[var(--border)]">
                                {rule.assignedUsers
                                  .filter(
                                    (u) => !rule.profiles.some((p) => p.id === u.employeeProfileId)
                                  )
                                  .map((u) => (
                                    <div
                                      key={u.id}
                                      className="text-[11px] text-[var(--text)]"
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
                        <Badge tone="warn" className="font-bold">
                          ≤ {rule.availableLimit}
                        </Badge>
                        <div className="text-[10px] text-[var(--muted)] mt-1">
                          leads threshold
                        </div>
                      </td>

                      {/* Fetch Limit */}
                      <td className="py-4 px-4 text-center align-top">
                        <Badge tone="ok" className="font-bold">
                          {rule.fetchLimit}
                        </Badge>
                        <div className="text-[10px] text-[var(--muted)] mt-1">
                          per request
                        </div>
                      </td>

                      {/* Fetch Count (Configured Max & Usage) */}
                      <td className="py-4 px-4 text-center align-top">
                        <Badge tone="info" className="font-bold">
                          {rule.fetchCount}
                        </Badge>
                        <div className="text-[10px] text-[var(--muted)] mt-1">
                          {rule.totalFetchesUsed} request(s) used
                        </div>
                      </td>

                      {/* Lead Source */}
                      <td className="py-4 px-4 align-top">
                        <Badge tone="info" className="font-semibold">
                          {rule.leadSource}
                        </Badge>
                      </td>

                      {/* Added By */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-semibold text-[var(--text)]">
                          {rule.createdByName}
                        </div>
                        <div className="text-[10px] text-[var(--muted)]">
                          {new Date(rule.createdAt).toISOString().split("T")[0]}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 pl-4 pr-6 text-right align-top">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="Pencil"
                            onClick={() => handleOpenEdit(rule)}
                            title="Edit Fetch Limit"
                            className="p-1.5 h-8 w-8 text-[var(--brand)] hover:bg-[var(--brand-tint)]"
                          />

                          {/* Reset Usage */}
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="RefreshCw"
                            onClick={() => setResettingRule(rule)}
                            title="Reset Fetch Request Counter (keeps audit history)"
                            className="p-1.5 h-8 w-8 text-[var(--warn)] hover:bg-[var(--warn-tint)]"
                          />

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="Trash2"
                            onClick={() => setDeletingRule(rule)}
                            title="Delete Fetch Limit Rule"
                            className="p-1.5 h-8 w-8 text-[var(--err)] hover:bg-[var(--err-tint)]"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
      <ConfirmDialog
        open={Boolean(deletingRule)}
        onClose={() => setDeletingRule(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Fetch Limit Rule?"
        description={
          deletingRule ? (
            <>
              Are you sure you want to delete the fetch limit rule for{" "}
              <strong className="text-[var(--text)]">
                {deletingRule.leadSource}
              </strong>{" "}
              (Profiles: {deletingRule.profiles.map((p) => p.name).join(", ")})?
              <br />
              Historical fetch logs and lead allotments will remain preserved.
            </>
          ) : undefined
        }
        confirmText="Confirm Delete"
        tone="danger"
        loading={isDeleting}
      />

      {/* Reset Usage Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(resettingRule)}
        onClose={() => setResettingRule(null)}
        onConfirm={handleConfirmResetUsage}
        title="Reset Request Usage Counter?"
        description={
          resettingRule ? (
            <>
              This will reset the successful fetch request counter back to 0 for all
              employees under this rule (
              <strong className="text-[var(--text)]">
                {resettingRule.leadSource}
              </strong>
              ).
              <br />
              Employees who reached their {resettingRule.fetchCount} request limit
              will be able to fetch leads again. All historical fetch audit records
              are safely preserved.
            </>
          ) : undefined
        }
        confirmText="Reset Counter"
        tone="warning"
        loading={isResetting}
      />
    </div>
  );
}
