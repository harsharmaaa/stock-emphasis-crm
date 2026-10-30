"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  type SafeDepartment,
  createDepartmentAction,
  updateDepartmentAction,
  toggleDepartmentStatusAction,
  deleteDepartmentAction,
  getDepartmentsAction,
} from "./actions";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  RefreshCw,
  FolderTree,
  ChevronLeft,
  Users2,
  Check,
} from "lucide-react";

interface DepartmentsClientProps {
  initialDepartments: SafeDepartment[];
}

export function DepartmentsClient({ initialDepartments }: DepartmentsClientProps) {
  const [departments, setDepartments] = useState<SafeDepartment[]>(initialDepartments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<SafeDepartment | null>(null);

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Feedback message
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const refreshData = () => {
    startTransition(async () => {
      const res = await getDepartmentsAction();
      if (res.success && res.departments) {
        setDepartments(res.departments);
      }
    });
  };

  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
          ? d.isActive
          : !d.isActive;
      return matchesSearch && matchesStatus;
    });
  }, [departments, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = departments.length;
    const active = departments.filter((d) => d.isActive).length;
    const inactive = total - active;
    const totalProfilesAssigned = departments.reduce((acc, d) => acc + d.profilesCount, 0);
    return { total, active, inactive, totalProfilesAssigned };
  }, [departments]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmittingCreate(true);

    try {
      const res = await createDepartmentAction({
        name: createName,
        isActive: createIsActive,
      });

      if (!res.success) {
        setCreateError(res.error || "Failed to create department.");
        setIsSubmittingCreate(false);
        return;
      }

      setCreateName("");
      setCreateIsActive(true);
      setIsCreateModalOpen(false);
      setFeedback({ type: "success", message: `Department "${res.department?.name}" created successfully!` });
      refreshData();
    } catch {
      setCreateError("An unexpected error occurred.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const openEditModal = (dept: SafeDepartment) => {
    setEditingDept(dept);
    setEditName(dept.name);
    setEditIsActive(dept.isActive);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setEditError(null);
    setIsSubmittingEdit(true);

    try {
      const res = await updateDepartmentAction({
        id: editingDept.id,
        name: editName,
        isActive: editIsActive,
      });

      if (!res.success) {
        setEditError(res.error || "Failed to update department.");
        setIsSubmittingEdit(false);
        return;
      }

      setEditingDept(null);
      setFeedback({ type: "success", message: `Department "${res.department?.name}" updated successfully!` });
      refreshData();
    } catch {
      setEditError("An unexpected error occurred.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteDepartment = async (dept: SafeDepartment) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete department "${dept.name}"?`
    );
    if (!confirmed) return;

    setActionLoadingId(dept.id);

    try {
      const res = await deleteDepartmentAction(dept.id);
      if (res.success) {
        setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
        setFeedback({
          type: "success",
          message: `Department "${dept.name}" deleted successfully.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to delete department.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to delete department." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (dept: SafeDepartment) => {
    setActionLoadingId(dept.id);
    const newStatus = !dept.isActive;

    try {
      const res = await toggleDepartmentStatusAction(dept.id, newStatus);
      if (res.success) {
        setDepartments((prev) =>
          prev.map((d) => (d.id === dept.id ? { ...d, isActive: newStatus } : d))
        );
        setFeedback({
          type: "success",
          message: `Department "${dept.name}" ${newStatus ? "activated" : "deactivated"} successfully.`,
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to change department status." });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to update status." });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/profiles"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              Employee Profiles
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-violet-600/10 dark:bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Building2 className="size-5" />
            </div>
            Department Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage company departments. Employee profiles reference these departments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={refreshData}
            disabled={isPending}
            className="p-2 rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            title="Refresh departments"
          >
            <RefreshCw className={`size-4 ${isPending ? "animate-spin text-violet-600" : ""}`} />
          </button>
          <button
            onClick={() => {
              setCreateError(null);
              setCreateName("");
              setCreateIsActive(true);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="size-4" />
            Add Department
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="size-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Departments</div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Active Departments</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.active}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">Profiles Assigned</div>
          <div className="text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400 mt-1">
            {stats.totalProfilesAssigned}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-white/[0.08]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-white/[0.06]">
            {(["ALL", "ACTIVE"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  statusFilter === filter
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {filter === "ALL" ? "All" : filter === "ACTIVE" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold w-12">#</th>
                <th className="py-3 px-4 font-semibold">Department Name</th>
                <th className="py-3 px-4 font-semibold">Associated Profiles</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Created Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <FolderTree className="size-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No departments found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept, index) => (
                  <tr
                    key={dept.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{index + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="size-3.5 text-violet-500 shrink-0" />
                        <span>{dept.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/profiles?department=${encodeURIComponent(dept.id)}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-violet-50 dark:bg-slate-800 dark:hover:bg-violet-950/40 text-slate-700 hover:text-violet-700 dark:text-slate-300 dark:hover:text-violet-300 font-medium transition-colors"
                      >
                        <Users2 className="size-3 text-slate-400" />
                        <span>{dept.profilesCount} profiles</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          dept.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            dept.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {dept.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(dept.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(dept)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit department"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(dept)}
                          disabled={actionLoadingId === dept.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete department"
                        >
                          {actionLoadingId === dept.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="size-4 text-violet-500" />
                Add New Department
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 sm:p-5 space-y-4">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales, Accounts, HR"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="createDeptIsActive"
                  checked={createIsActive}
                  onChange={(e) => setCreateIsActive(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500 size-4 cursor-pointer"
                />
                <label htmlFor="createDeptIsActive" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Active (Department is visible for employee profile selection)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                >
                  {isSubmittingCreate ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="size-4 text-violet-500" />
                Edit Department
              </h3>
              <button
                onClick={() => setEditingDept(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 sm:p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editDeptIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500 size-4 cursor-pointer"
                />
                <label htmlFor="editDeptIsActive" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Active (Department is visible for employee profile selection)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                >
                  {isSubmittingEdit ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Update Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

