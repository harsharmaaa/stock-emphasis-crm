"use client";

import { useState, useTransition } from "react";
import type { SafeActivityLog } from "./actions";
import { getActivityLogsAction } from "./actions";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Select,
  Pagination,
  EmptyState,
} from "@/src/components/ui";
import {
  History,
  Filter,
  UserPlus,
  Edit2,
  KeyRound,
  ToggleLeft,
  Layers,
  UserCheck,
  Trash2,
  Clock,
} from "lucide-react";

interface ActivityLogClientProps {
  initialLogs: SafeActivityLog[];
  initialTotalCount: number;
  initialTotalPages: number;
}

const ACTION_OPTIONS = [
  { value: "ALL", label: "All Audit Events" },
  { value: "USER_CREATED", label: "User Created" },
  { value: "USER_UPDATED", label: "Profile Updates" },
  { value: "PASSWORD_RESET", label: "Password Resets" },
  { value: "STATUS_TOGGLED", label: "Status Toggled" },
  { value: "TEAM_CREATED", label: "Team Created" },
  { value: "TEAM_UPDATED", label: "Team Updated" },
  { value: "TEAM_DELETED", label: "Team Deleted" },
  { value: "TEAM_MEMBER_ASSIGNED", label: "Team / Manager Assigned" },
];

export function ActivityLogClient({
  initialLogs,
  initialTotalCount,
  initialTotalPages,
}: ActivityLogClientProps) {
  const [logs, setLogs] = useState<SafeActivityLog[]>(initialLogs);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const fetchLogs = (page: number = currentPage, actionFilter: string = selectedAction) => {
    startTransition(async () => {
      const res = await getActivityLogsAction({
        page,
        pageSize: 15,
        actionFilter,
      });

      if (res.success) {
        setLogs(res.logs ?? []);
        setTotalCount(res.totalCount ?? 0);
        setTotalPages(res.totalPages ?? 1);
        setCurrentPage(res.currentPage ?? 1);
      }
    });
  };

  const handleActionChange = (action: string) => {
    setSelectedAction(action);
    fetchLogs(1, action);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchLogs(newPage, selectedAction);
  };

  const getActionConfig = (action: string) => {
    switch (action) {
      case "USER_CREATED":
        return {
          icon: UserPlus,
          label: "User Created",
          tone: "ok" as const,
        };
      case "USER_UPDATED":
        return {
          icon: Edit2,
          label: "User Updated",
          tone: "info" as const,
        };
      case "PASSWORD_RESET":
        return {
          icon: KeyRound,
          label: "Password Reset",
          tone: "warn" as const,
        };
      case "STATUS_TOGGLED":
        return {
          icon: ToggleLeft,
          label: "Status Changed",
          tone: "info" as const,
        };
      case "TEAM_CREATED":
        return {
          icon: Layers,
          label: "Team Created",
          tone: "ok" as const,
        };
      case "TEAM_UPDATED":
        return {
          icon: Edit2,
          label: "Team Updated",
          tone: "info" as const,
        };
      case "TEAM_DELETED":
        return {
          icon: Trash2,
          label: "Team Deleted",
          tone: "err" as const,
        };
      case "TEAM_MEMBER_ASSIGNED":
        return {
          icon: UserCheck,
          label: "Assignment",
          tone: "info" as const,
        };
      default:
        return {
          icon: History,
          label: action,
          tone: "info" as const,
        };
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Activity & Audit Log</span>
            <Badge tone="info">
              {totalCount} Recorded {totalCount === 1 ? "Event" : "Events"}
            </Badge>
          </div>
        }
        description="Immutable, server-verified event trail documenting user provisioning, role assignments, and department allocations."
        breadcrumbs={[
          { label: "Governance", href: "/admin/users" },
          { label: "Activity Log" },
        ]}
        actions={
          <Button
            variant="sec"
            size="sm"
            icon="RefreshCw"
            loading={isPending}
            onClick={() => fetchLogs()}
            aria-label="Refresh audit trail"
          />
        }
      />

      {/* Filter Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <Filter className="size-3.5 text-[var(--brand)]" />
            <span className="font-medium">Filter by Action:</span>
          </div>

          <div className="w-full sm:w-auto">
            <Select
              value={selectedAction}
              onChange={(e) => handleActionChange(e.target.value)}
              className="text-xs w-full sm:w-64"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4 sm:px-6">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4 sm:px-6">Details / Narrative</th>
                <th className="py-3 px-4">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.05]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8">
                    <EmptyState
                      icon="Inbox"
                      title="No Audit Events Recorded"
                      description="Administrative operations performed in User Management or Teams will automatically appear here."
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const config = getActionConfig(log.action);
                  const Icon = config.icon;
                  const logDate = new Date(log.createdAt);

                  return (
                    <tr key={log.id} className="hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          <Clock className="size-3 text-[var(--muted)]" />
                          <span>
                            {logDate.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            {logDate.toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge tone={config.tone}>
                          <span className="flex items-center gap-1">
                            <Icon className="size-3" />
                            <span>{config.label}</span>
                          </span>
                        </Badge>
                      </td>

                      {/* Narrative Details */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-800 dark:text-slate-200">
                        <span className="leading-relaxed block">{log.details}</span>
                        {(log.targetUser || log.targetTeam) && (
                          <div className="flex flex-wrap items-center gap-2 mt-1 font-mono text-[10px] text-[var(--muted)]">
                            {log.targetUser && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300">
                                Target: {log.targetUser.name} ({log.targetUser.role})
                              </span>
                            )}
                            {log.targetTeam && (
                              <span className="px-1.5 py-0.5 rounded bg-[var(--brand-soft)]/20 border border-[var(--brand)]/30 text-[var(--brand)]">
                                Team: {log.targetTeam.name}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.actor ? (
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-lg bg-[var(--brand-soft)]/20 text-[var(--brand)] border border-[var(--brand)]/20 flex items-center justify-center font-bold text-[10px]">
                              {log.actor.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-slate-900 dark:text-slate-200 text-xs block truncate">
                                {log.actor.name}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--brand)] block">
                                {log.actor.role}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--muted)] italic text-[11px]">System</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted)]">
            <div>
              Showing <strong className="text-slate-900 dark:text-white">{logs.length}</strong> of{" "}
              <strong className="text-slate-900 dark:text-white">{totalCount}</strong> recorded events
            </div>
            <Pagination
              page={currentPage}
              pages={totalPages}
              onChange={handlePageChange}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
