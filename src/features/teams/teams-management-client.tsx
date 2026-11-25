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
  PageHeader,
  Card,
  Button,
  Badge,
  Modal,
  ConfirmDialog,
  Field,
  Input,
  Select,
  Textarea,
  EmptyState,
  useToast,
} from "@/src/components/ui";
import {
  Layers,
  Users,
  Briefcase,
  UserCheck,
  Edit2,
  Trash2,
  Search,
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
  const toast = useToast();
  const [teams, setTeams] = useState<SafeTeam[]>(initialTeams);
  const [managers, setManagers] = useState<EligibleManager[]>(initialManagers);
  const [employees, setEmployees] = useState<EligibleEmployee[]>(initialEmployees);

  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SafeTeam | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<SafeTeam | null>(null);
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
      toast.success("Team Created", `Team "${res.team?.name}" created successfully!`);
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
      toast.success("Team Updated", `Team "${editName}" updated successfully.`);
      refreshData();
    } catch {
      setEditError("An unexpected network error occurred.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Team
  const handleConfirmDelete = async () => {
    if (!deletingTeam) return;

    try {
      const res = await deleteTeamAction(deletingTeam.id);
      if (!res.success) {
        toast.error("Delete Failed", res.error ?? "Failed to delete team.");
        return;
      }
      toast.success("Team Deleted", `Team "${deletingTeam.name}" was safely deleted.`);
      setDeletingTeam(null);
      refreshData();
    } catch {
      toast.error("Error", "Failed to delete team due to network error.");
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
      toast.success("Assignment Saved", "Personnel assignment updated successfully.");
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
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Teams & Hierarchy</span>
            <Badge tone="info">
              {teams.length} {teams.length === 1 ? "Team" : "Teams"}
            </Badge>
          </div>
        }
        description="Organize operational squads, designate Team Leads, and govern employee-manager reporting hierarchies."
        breadcrumbs={[
          { label: "Governance", href: "/admin/users" },
          { label: "Teams" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="sec"
              size="sm"
              icon="RefreshCw"
              loading={isPending}
              onClick={refreshData}
              aria-label="Refresh teams"
            />
            <Button
              variant="primary"
              size="sm"
              leftIcon="Plus"
              onClick={() => {
                setCreateError(null);
                setCreateName("");
                setCreateDescription("");
                setCreateLeaderId("");
                setIsCreateModalOpen(true);
              }}
            >
              Create Team
            </Button>
          </div>
        }
      />

      {/* Unassigned Personnel Notice */}
      {unassignedEmployees.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-5 shrink-0 text-amber-500 dark:text-amber-400" />
            <div>
              <strong className="font-semibold text-amber-800 dark:text-amber-200">
                {unassignedEmployees.length} unassigned {unassignedEmployees.length === 1 ? "Employee" : "Employees"}
              </strong>
              <span className="text-amber-600 dark:text-amber-400/90 ml-1.5 hidden md:inline">
                Personnel awaiting team or department allocation.
              </span>
            </div>
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
            Assignment controls available below
          </span>
        </div>
      )}

      {/* Search Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              type="text"
              placeholder="Search teams by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="text-xs text-[var(--muted)] flex items-center gap-2">
            <span>Active Managers:</span>
            <Badge tone="info">{managers.length}</Badge>
          </div>
        </div>
      </Card>

      {/* Teams Grid Cards */}
      {filteredTeams.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon="Users"
            title="No Teams Found"
            description="Create your first department squad or team using the button above."
            actionLabel="Create Team"
            actionIcon="Plus"
            onAction={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((team) => (
            <Card
              key={team.id}
              className="p-5 flex flex-col justify-between hover:border-[var(--brand)]/30 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[var(--brand-soft)]/20 text-[var(--brand)] border border-[var(--brand)]/20">
                      <Layers className="size-4.5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[var(--brand)] transition-colors">
                        {team.name}
                      </h2>
                      <span className="text-[11px] text-[var(--muted)] font-mono">
                        {team.membersCount} {team.membersCount === 1 ? "Member" : "Members"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(team)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title="Edit Team"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTeam(team)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Team"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {team.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                    {team.description}
                  </p>
                )}

                {/* Team Lead Pill */}
                <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                    Team Lead
                  </span>
                  {team.leader ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center size-6 rounded-lg bg-[var(--brand-soft)]/20 text-[var(--brand)] border border-[var(--brand)]/20 text-[10px] font-bold">
                        {team.leader.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                          {team.leader.name}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] block truncate">
                          {team.leader.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--muted)] italic">
                      No designated supervisor assigned
                    </span>
                  )}
                </div>

                {/* Member Roster List Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1">
                      <Users className="size-3" />
                      <span>Roster ({team.members.length})</span>
                    </span>
                  </div>

                  {team.members.length === 0 ? (
                    <p className="text-[11px] text-[var(--muted)] italic py-2">
                      No members allocated to this squad yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {team.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                              {m.name}
                            </span>
                            <span className="text-[10px] text-[var(--muted)] block truncate">
                              Manager: {m.manager ? m.manager.name : "None"}
                            </span>
                          </div>
                          <Badge tone={m.isActive ? "ok" : "warn"} dot>
                            {m.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] mt-4 flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                <span className="font-mono">ID: {team.id.slice(-6)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PERSONNEL ALLOCATION TABLE */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="size-4.5 text-[var(--brand)]" />
              <span>Employee Squad Allocation</span>
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Assign CRM operational staff to departmental squads and reporting supervisors.
            </p>
          </div>
          <Badge tone="info">
            {employees.length} Operations Personnel
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Assigned Team</th>
                <th className="py-3 px-4 font-semibold">Direct Supervisor</th>
                <th className="py-3 px-4 font-semibold">Account Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                    No employee accounts found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{emp.name}</div>
                      <div className="text-[11px] text-[var(--muted)] truncate max-w-xs">{emp.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      {emp.team ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--brand-soft)]/15 border border-[var(--brand)]/20 text-[var(--brand)] font-medium text-[11px]">
                          <Layers className="size-3" />
                          <span>{emp.team.name}</span>
                        </span>
                      ) : (
                        <Badge tone="warn">Unallocated</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {emp.manager ? (
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {emp.manager.name}
                        </div>
                      ) : (
                        <span className="text-[var(--muted)] italic">No reporting manager</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone={emp.isActive ? "ok" : "warn"} dot>
                        {emp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="sec"
                        size="sm"
                        leftIcon="Users"
                        onClick={() => openAssignModal(emp)}
                      >
                        Assign
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingTeam)}
        onClose={() => setDeletingTeam(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Team"
        description={
          deletingTeam
            ? `Are you sure you want to delete team "${deletingTeam.name}"? Assigned members will be safely unlinked from this team.`
            : ""
        }
        confirmText="Delete Team"
        tone="danger"
      />

      {/* CREATE TEAM MODAL */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Team"
        description="Establish an operational warehouse unit and designate leadership."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div role="alert" className="p-3 rounded-xl bg-[var(--err)]/10 text-[var(--err)] text-xs font-medium">
              {createError}
            </div>
          )}

          <Field label="Team Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Inbound Stock Receiving"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
          </Field>

          <Field label="Description (Optional)">
            <Textarea
              rows={2}
              placeholder="Brief description of responsibilities..."
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
            />
          </Field>

          <Field label="Designated Team Lead" description="Active Managers only">
            <Select
              value={createLeaderId}
              onChange={(e) => setCreateLeaderId(e.target.value)}
            >
              <option value="">No Team Lead (Unassigned)</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </Select>
          </Field>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button variant="sec" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isSubmittingCreate}>
              Create Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <Modal
          open={Boolean(editingTeam)}
          onClose={() => setEditingTeam(null)}
          title={`Edit Team: ${editingTeam.name}`}
          size="md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div role="alert" className="p-3 rounded-xl bg-[var(--err)]/10 text-[var(--err)] text-xs font-medium">
                {editError}
              </div>
            )}

            <Field label="Team Name" required>
              <Input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </Field>

            <Field label="Description (Optional)">
              <Textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </Field>

            <Field label="Designated Team Lead">
              <Select
                value={editLeaderId}
                onChange={(e) => setEditLeaderId(e.target.value)}
              >
                <option value="">No Team Lead (Unassigned)</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </Select>
            </Field>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button variant="sec" size="sm" onClick={() => setEditingTeam(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={isSubmittingEdit}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ASSIGN EMPLOYEE MODAL */}
      {assigningEmployee && (
        <Modal
          open={Boolean(assigningEmployee)}
          onClose={() => setAssigningEmployee(null)}
          title={`Assign Personnel: ${assigningEmployee.name}`}
          description={`Allocate ${assigningEmployee.name} to a departmental squad and reporting manager.`}
          size="md"
        >
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            {assignError && (
              <div role="alert" className="p-3 rounded-xl bg-[var(--err)]/10 text-[var(--err)] text-xs font-medium">
                {assignError}
              </div>
            )}

            <Field label="Assign to Squad / Team">
              <Select
                value={assignTeamId}
                onChange={(e) => setAssignTeamId(e.target.value)}
              >
                <option value="">No Team (Unallocated)</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.leader ? `(Lead: ${t.leader.name})` : "(No Lead)"}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Direct Reporting Supervisor" description="Must be an active account with MANAGER role.">
              <Select
                value={assignManagerId}
                onChange={(e) => setAssignManagerId(e.target.value)}
              >
                <option value="">No Reporting Manager</option>
                {managers
                  .filter((m) => m.id !== assigningEmployee.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
              </Select>
            </Field>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button variant="sec" size="sm" onClick={() => setAssigningEmployee(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={isSubmittingAssign}>
                Save Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
