"use client";

import { useState } from "react";
import type { EmployeeActivityLog } from "./actions";
import { getEmployeeActivityLogsAction } from "./actions";
import {
  History,
  Layers,
  Clock,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
} from "lucide-react";

interface EmployeeActivityClientProps {
  initialLogs: EmployeeActivityLog[];
  initialTotalCount: number;
  initialTotalPages: number;
}

const ACTION_FILTERS = [
  { label: "All My Activity", value: "ALL" },
  { label: "Follow-ups", value: "INVENTORY_FOLLOW_UP" },
  { label: "Task Completed", value: "TASK_COMPLETED" },
  { label: "Team Assignments", value: "TEAM_MEMBER_ASSIGNED" },
  { label: "Status Toggled", value: "STATUS_TOGGLED" },
];

export function EmployeeActivityClient({
  initialLogs,
  initialTotalCount,
  initialTotalPages,
}: EmployeeActivityClientProps) {
  const [logs, setLogs] = useState<EmployeeActivityLog[]>(initialLogs);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async (page: number, filter: string) => {
    setIsLoading(true);
    try {
      const res = await getEmployeeActivityLogsAction({
        page,
        pageSize: 15,
        actionFilter: filter,
      });

      if (res.success && res.logs) {
        setLogs(res.logs);
        setTotalCount(res.totalCount ?? 0);
        setTotalPages(res.totalPages ?? 1);
        setCurrentPage(page);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    fetchLogs(1, filter);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchLogs(newPage, activeFilter);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="size-5 text-emerald-400" />
            <span>My Activity History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personal audit trail of your completed tasks, inspection notes, and team assignments
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>{totalCount} Total Entries</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        {ACTION_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === f.value
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Logs Feed */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Activity className="size-4 animate-spin text-emerald-400" />
            <span>Refreshing activity logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <History className="size-8 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">
              No activity recorded for this criteria.
            </p>
            <p className="text-slate-500 mt-1">
              Your logged follow-ups and actions will be preserved here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {logs.map((log) => {
              const actionColor =
                log.action.includes("FOLLOW_UP")
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : log.action.includes("TASK")
                  ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
                  : log.action.includes("TEAM")
                  ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                  : "bg-purple-500/10 text-purple-300 border-purple-500/30";

              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/20 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${actionColor}`}
                      >
                        {log.action}
                      </span>

                      {log.actor && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <User className="size-3 text-slate-500" />
                          <span>By: {log.actor.name}</span>
                        </span>
                      )}

                      {log.targetTeam && (
                        <span className="text-[11px] text-emerald-300 flex items-center gap-1">
                          <Layers className="size-3 text-emerald-400" />
                          <span>Team: {log.targetTeam.name}</span>
                        </span>
                      )}
                    </div>

                    {log.details && (
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {log.details}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono shrink-0 self-end sm:self-center">
                    <Clock className="size-3 text-slate-400" />
                    <span>
                      {new Date(log.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page <strong className="text-white">{currentPage}</strong> of{" "}
              <strong className="text-white">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 transition-colors"
              >
                <ChevronLeft className="size-3.5" />
                <span>Previous</span>
              </button>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
