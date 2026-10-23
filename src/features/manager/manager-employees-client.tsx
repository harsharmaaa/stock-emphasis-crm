"use client";

import { useState } from "react";
import type { ManagerSubordinate } from "./actions";
import {
  Users,
  Search,
  Layers,
  Filter,
} from "lucide-react";

interface ManagerEmployeesClientProps {
  initialEmployees: ManagerSubordinate[];
}

export function ManagerEmployeesClient({
  initialEmployees,
}: ManagerEmployeesClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const filteredEmployees = initialEmployees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      (emp.team && emp.team.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "ACTIVE"
        ? emp.isActive
        : !emp.isActive;

    return matchesSearch && matchesStatus;
  });

  const totalCount = initialEmployees.length;
  const activeCount = initialEmployees.filter((e) => e.isActive).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-6">
      {/* Top Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="size-5 text-blue-400" />
            <span>Supervised Staff</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Employees reporting to you directly or assigned to your operational units
          </p>
        </div>

        {/* Quick KPI badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300">
            {totalCount} Total
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {activeCount} Active
          </span>
          {inactiveCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-rose-400" />
              {inactiveCount} Inactive
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="size-4 text-slate-400 hidden sm:block" />
          <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === status
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {status === "ALL" ? "All" : status === "ACTIVE" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subordinates Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 sm:px-6">Employee</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Department / Team</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right sm:px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Users className="size-6 mx-auto mb-2 text-slate-600" />
                    <p className="font-medium text-slate-300">
                      {search || statusFilter !== "ALL"
                        ? "No employees match your search criteria."
                        : "No subordinate employees currently assigned."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-800/25 transition-colors"
                  >
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700/80">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200">
                            {emp.name}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {emp.role}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {emp.email}
                    </td>

                    <td className="py-3.5 px-4">
                      {emp.team ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                          <Layers className="size-3 text-blue-400" />
                          <span>{emp.team.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(emp.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right sm:px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            emp.isActive ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                        />
                        <span>{emp.isActive ? "Active" : "Inactive"}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
