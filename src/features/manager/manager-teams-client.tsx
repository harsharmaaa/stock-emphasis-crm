"use client";

import { useState } from "react";
import type { ManagerTeam } from "./actions";
import {
  Layers,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Boxes,
} from "lucide-react";

interface ManagerTeamsClientProps {
  initialTeams: ManagerTeam[];
}

export function ManagerTeamsClient({ initialTeams }: ManagerTeamsClientProps) {
  const [search, setSearch] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(
    initialTeams[0]?.id || null
  );

  const filteredTeams = initialTeams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="size-5 text-blue-400" />
            <span>Teams Led</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Department teams and assigned warehouse staff under your supervision
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md">
          <Boxes className="size-8 mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-300">
            {search ? "No teams match your search." : "No teams assigned."}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {search
              ? "Try adjusting your search criteria."
              : "An administrator has not assigned any team leadership to your account yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTeams.map((team) => {
            const isExpanded = expandedTeamId === team.id;
            const activePercent =
              team.membersCount > 0
                ? Math.round((team.activeMembersCount / team.membersCount) * 100)
                : 0;

            return (
              <div
                key={team.id}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg overflow-hidden transition-all hover:border-slate-700/80"
              >
                {/* Team Summary Card Header */}
                <div
                  onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                  className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-slate-850/40 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Layers className="size-4" />
                      </div>
                      <h3 className="text-base font-bold text-white truncate">
                        {team.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        Lead Supervisor
                      </span>
                    </div>

                    {team.description && (
                      <p className="text-xs text-slate-400 leading-relaxed pl-10">
                        {team.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6 shrink-0 self-end md:self-auto">
                    {/* Members Count KPI */}
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 justify-end">
                        <Users className="size-3.5 text-blue-400" />
                        <span className="font-bold text-white">
                          {team.membersCount}
                        </span>
                        <span>{team.membersCount === 1 ? "Member" : "Members"}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {team.activeMembersCount} active ({activePercent}%)
                      </div>
                    </div>

                    {/* Expand/Collapse Toggle Button */}
                    <button
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      aria-label="Toggle team members"
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Team Members Table */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/40 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                        Allocated Staff Roster
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Created on {new Date(team.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {team.members.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4 text-center">
                        No employees currently assigned to this department.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="py-2.5 px-3">Name</th>
                              <th className="py-2.5 px-3">Email</th>
                              <th className="py-2.5 px-3">Role</th>
                              <th className="py-2.5 px-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {team.members.map((member) => (
                              <tr
                                key={member.id}
                                className="hover:bg-slate-800/30 transition-colors"
                              >
                                <td className="py-2.5 px-3 font-semibold text-slate-200">
                                  {member.name}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                                  {member.email}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                    {member.role}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                      member.isActive
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    }`}
                                  >
                                    <span
                                      className={`size-1.5 rounded-full ${
                                        member.isActive
                                          ? "bg-emerald-400"
                                          : "bg-rose-400"
                                      }`}
                                    />
                                    <span>
                                      {member.isActive ? "Active" : "Inactive"}
                                    </span>
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
