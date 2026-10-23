"use client";

import { useState, useTransition } from "react";
import type { SafeActivityLog } from "./actions";
import { getActivityLogsAction } from "./actions";
import {
  History,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
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

  const getActionBadge = (action: string) => {
    switch (action) {
      case "USER_CREATED":
        return {
          icon: UserPlus,
          label: "User Created",
          color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        };
      case "USER_UPDATED":
        return {
          icon: Edit2,
          label: "User Updated",
          color: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        };
      case "PASSWORD_RESET":
        return {
          icon: KeyRound,
          label: "Password Reset",
          color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        };
      case "STATUS_TOGGLED":
        return {
          icon: ToggleLeft,
          label: "Status Changed",
          color: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        };
      case "TEAM_CREATED":
        return {
          icon: Layers,
          label: "Team Created",
          color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        };
      case "TEAM_UPDATED":
        return {
          icon: Edit2,
          label: "Team Updated",
          color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        };
      case "TEAM_DELETED":
        return {
          icon: Trash2,
          label: "Team Deleted",
          color: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        };
      case "TEAM_MEMBER_ASSIGNED":
        return {
          icon: UserCheck,
          label: "Assignment",
          color: "bg-teal-500/15 text-teal-300 border-teal-500/30",
        };
      default:
        return {
          icon: History,
          label: action,
          color: "bg-slate-700 text-slate-300 border-slate-600",
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Activity & Audit Log
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              {totalCount} Recorded {totalCount === 1 ? "Event" : "Events"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable, server-verified event trail documenting user provisioning, role assignments, and department allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs()}
            disabled={isPending}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh audit trail"
          >
            <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter className="size-3.5 text-purple-400" />
          <span className="font-medium">Filter by Action:</span>
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={selectedAction}
            onChange={(e) => handleActionChange(e.target.value)}
            className="w-full sm:w-64 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 sm:px-6">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4 sm:px-6">Details / Narrative</th>
                <th className="py-3 px-4">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <History className="size-8 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No audit events recorded</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Actions performed in User Management or Teams will automatically appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;
                  const logDate = new Date(log.createdAt);

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                          <Clock className="size-3 text-slate-500" />
                          <span>
                            {logDate.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                            {" "}
                            {logDate.toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badge.color}`}
                        >
                          <Icon className="size-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Narrative Details */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-200">
                        <span className="leading-relaxed block">{log.details}</span>
                        {(log.targetUser || log.targetTeam) && (
                          <div className="flex flex-wrap items-center gap-2 mt-1 font-mono text-[10px] text-slate-400">
                            {log.targetUser && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/60 text-slate-300">
                                Target: {log.targetUser.name} ({log.targetUser.role})
                              </span>
                            )}
                            {log.targetTeam && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-950/40 border border-indigo-800/50 text-indigo-300">
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
                            <div className="size-6 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center justify-center font-bold text-[10px]">
                              {log.actor.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-slate-200 text-xs block truncate">
                                {log.actor.name}
                              </span>
                              <span className="font-mono text-[10px] text-purple-400 block">
                                {log.actor.role}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">System</span>
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
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{logs.length}</strong> of{" "}
            <strong className="text-white">{totalCount}</strong> recorded events
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="size-4" />
              <span>Previous</span>
            </button>

            <span className="font-mono px-2 text-slate-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Next</span>
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
