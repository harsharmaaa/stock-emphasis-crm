"use client";

import { useState, useTransition } from "react";
import type { SafeTeam, EligibleManager, EligibleEmployee } from "./actions";
import {
  createTeamAction,
  updateTeamAction,
  deleteTeamAction,
  assignEmployeeTeamAndManagerAction,
  getTeamsAction,
} from "./actions";
import {
  Layers,
  Users,
  Plus,
  Briefcase,
  UserCheck,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

interface TeamsManagementClientProps {
  initialTeams: SafeTeam[];
  initialManagers: EligibleManager[];
  initialEmployees: EligibleEmployee[];
}

export function TeamsManagementClient({
  initialTeams,
  initialManagers,
  initialEmployees,
}: TeamsManagementClientProps) {
  const [teams, setTeams] = useState<SafeTeam[]>(initialTeams);
  const [managers, setManagers] = useState<EligibleManager[]>(initialManagers);
  const [employees, setEmployees] = useState<EligibleEmployee[]>(initialEmployees);

  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SafeTeam | null>(null);
  const [assigningEmployee, setAssigningEmployee] = useState<EligibleEmployee | null>(null);

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLeaderId, setCreateLeaderId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLeaderId, setEditLeaderId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Assignment form state
  const [assignTeamId, setAssignTeamId] = useState<string>("");
  const [assignManagerId, setAssignManagerId] = useState<string>("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Refresh data
  const refreshData = () => {
    startTransition(async () => {
      const res = await getTeamsAction();
      if (res.success) {
        setTeams(res.teams ?? []);
        setManagers(res.managers ?? []);
        setEmployees(res.employees ?? []);
      }
    });
  };

  // Open Edit Modal
  const openEditModal = (team: SafeTeam) => {
    setEditingTeam(team);
    setEditName(team.name);
    setEditDescription(team.description ?? "");
    setEditLeaderId(team.leaderId ?? "");
    setEditError(null);
  };

  // Open Assign Modal
  const openAssignModal = (employee: EligibleEmployee) => {
    setAssigningEmployee(employee);
    setAssignTeamId(employee.teamId ?? "");
    setAssignManagerId(employee.managerId ?? "");
    setAssignError(null);
  };

  // Handle Create Team
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmittingCreate(true);

    try {
      const res = await createTeamAction({
        name: createName,
        description: createDescription,
        leaderId: createLeaderId || undefined,
      });

      if (!res.success) {
        setCreateError(res.error ?? "Failed to create team.");
        setIsSubmittingCreate(false);
        return;
      }

      setCreateName("");
      setCreateDescription("");
      setCreateLeaderId("");
      setIsCreateModalOpen(false);
      refreshData();
    } catch {
      setCreateError("An unexpected network error occurred.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Edit Team
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setEditError(null);
    setIsSubmittingEdit(true);

    try {
      const res = await updateTeamAction({
        teamId: editingTeam.id,
        name: editName,
        description: editDescription,
        leaderId: editLeaderId || undefined,
      });

      if (!res.success) {
        setEditError(res.error ?? "Failed to update team.");
        setIsSubmittingEdit(false);
        return;
      }

      setEditingTeam(null);
      refreshData();
    } catch {
      setEditError("An unexpected network error occurred.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Team
  const handleDeleteTeam = async (team: SafeTeam) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete team "${team.name}"? Assigned members will be safely unlinked from this team.`
    );
    if (!confirmed) return;

    try {
      const res = await deleteTeamAction(team.id);
      if (!res.success) {
        alert(res.error ?? "Failed to delete team.");
        return;
      }
      refreshData();
    } catch {
      alert("Failed to delete team due to network error.");
    }
  };

  // Handle Assignment Submit
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningEmployee) return;
    setAssignError(null);
    setIsSubmittingAssign(true);

    try {
      const res = await assignEmployeeTeamAndManagerAction({
        employeeId: assigningEmployee.id,
        teamId: assignTeamId || null,
        managerId: assignManagerId || null,
      });

      if (!res.success) {
        setAssignError(res.error ?? "Failed to save assignment.");
        setIsSubmittingAssign(false);
        return;
      }

      setAssigningEmployee(null);
      refreshData();
    } catch {
      setAssignError("An unexpected network error occurred.");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const unassignedEmployees = employees.filter((e) => !e.teamId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Teams & Hierarchy Management
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {teams.length} {teams.length === 1 ? "Team" : "Teams"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Organize warehouse departments, designate Team Leads, and govern employee-manager hierarchies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={refreshData}
            disabled={isPending}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh teams"
          >
            <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="size-4" />
            <span>Create New Team</span>
          </button>
        </div>
      </div>

      {/* Unassigned Personnel Notice */}
      {unassignedEmployees.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-5 shrink-0 text-amber-400" />
            <div>
              <strong className="font-semibold text-amber-200">
                {unassignedEmployees.length} unassigned {unassignedEmployees.length === 1 ? "Employee" : "Employees"}
              </strong>
              <span className="text-amber-400/90 ml-1.5 hidden md:inline">
                Personnel awaiting team or department allocation.
              </span>
            </div>
          </div>
          <span className="text-[11px] text-amber-400 font-mono">
            Assignment controls available below
          </span>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search teams by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          Active Managers: <strong className="text-white">{managers.length}</strong>
        </div>
      </div>

      {/* Teams Grid Cards */}
      {filteredTeams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <Layers className="size-8 mx-auto text-slate-500 mb-2" />
          <p className="text-sm font-semibold text-slate-300">No teams found</p>
          <p className="text-xs text-slate-500 mt-1">
            Create your first department team using the button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-xl flex flex-col justify-between hover:border-slate-700/80 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Layers className="size-4.5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {team.name}
                      </h2>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {team.membersCount} {team.membersCount === 1 ? "Member" : "Members"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(team)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Team"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Team"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {team.description && (
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                    {team.description}
                  </p>
                )}

                {/* Team Lead Pill */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Team Lead
                  </span>
                  {team.leader ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center size-6 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                        {team.leader.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-200 truncate block">
                          {team.leader.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono truncate block">
                          {team.leader.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      No Manager designated as Team Lead
                    </span>
                  )}
                </div>

                {/* Member Roster Preview */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Department Members
                  </span>
                  {team.members.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      No employees assigned to this team yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {team.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-800 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-slate-200 truncate block">
                              {member.name}
                            </span>
                            {member.manager && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Reports to: {member.manager.name}
                              </span>
                            )}
                          </div>
                          <span
                            className={`size-1.5 rounded-full ${
                              member.isActive ? "bg-emerald-400" : "bg-rose-500"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employee Hierarchy Assignment Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl overflow-hidden mt-10">
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="size-4.5 text-indigo-400" />
              <span>Employee Assignment Roster</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Directly assign warehouse staff to teams and designated reporting managers.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Employees: {employees.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/20 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 sm:px-6">Employee</th>
                <th className="py-3 px-4">Assigned Team</th>
                <th className="py-3 px-4">Reporting Manager</th>
                <th className="py-3 px-4 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No employee accounts provisioned.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[10px]">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-200 block">
                            {emp.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {emp.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {emp.team ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          <Layers className="size-3" />
                          <span>{emp.team.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {emp.manager ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          <Briefcase className="size-3" />
                          <span>{emp.manager.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No Manager</span>
                      )}
                    </td>

                    <td className="py-3 px-4 sm:px-6 text-right">
                      <button
                        onClick={() => openAssignModal(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all"
                      >
                        <UserCheck className="size-3.5" />
                        <span>Assign</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE TEAM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 relative text-slate-100">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Plus className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create New Team</h2>
                <p className="text-xs text-slate-400">
                  Establish an operational warehouse unit and designate leadership
                </p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inbound Stock Receiving"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of responsibilities..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Designated Team Lead
                  </label>
                  <span className="text-[11px] text-blue-400">Active Managers only</span>
                </div>
                <select
                  value={createLeaderId}
                  onChange={(e) => setCreateLeaderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="">No Team Lead (Unassigned)</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingCreate}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Team</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 relative text-slate-100">
            <button
              onClick={() => setEditingTeam(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Edit2 className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Edit Team Details</h2>
                <p className="text-xs text-slate-400">
                  Update name, description, or assigned supervisor
                </p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Designated Team Lead
                </label>
                <select
                  value={editLeaderId}
                  onChange={(e) => setEditLeaderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="">No Team Lead (Unassigned)</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN EMPLOYEE MODAL */}
      {assigningEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 relative text-slate-100">
            <button
              onClick={() => setAssigningEmployee(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <UserCheck className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Assign Employee</h2>
                <p className="text-xs text-slate-400">
                  Assign {assigningEmployee.name} to a department and reporting manager
                </p>
              </div>
            </div>

            {assignError && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Department / Team
                </label>
                <select
                  value={assignTeamId}
                  onChange={(e) => setAssignTeamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="">Unassigned (No Team)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Rule: Employees belong to exactly one team at a time.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Direct Reporting Manager
                </label>
                <select
                  value={assignManagerId}
                  onChange={(e) => setAssignManagerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="">None (No Direct Manager)</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Rule: Only active accounts with the MANAGER role can be selected.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssigningEmployee(null)}
                  disabled={isSubmittingAssign}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmittingAssign ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm Assignment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
