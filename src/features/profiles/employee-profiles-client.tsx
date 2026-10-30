"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  type SafeEmployeeProfile,
  type DepartmentOption,
  createEmployeeProfileAction,
  updateEmployeeProfileAction,
  toggleEmployeeProfileStatusAction,
  deleteEmployeeProfileAction,
  getEmployeeProfilesAction,
} from "./actions";
import {
  UserCheck2,
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
  Eye,
  Building2,
  Layers,
  ChevronLeft,
  FileSpreadsheet,
  Check,
  TrendingUp,
  CreditCard,
  Users,
} from "lucide-react";

interface EmployeeProfilesClientProps {
  initialProfiles: SafeEmployeeProfile[];
  initialDepartments: DepartmentOption[];
}

export function EmployeeProfilesClient({
  initialProfiles,
  initialDepartments,
}: EmployeeProfilesClientProps) {
  const [profiles, setProfiles] = useState<SafeEmployeeProfile[]>(initialProfiles);
  const [departments, setDepartments] = useState<DepartmentOption[]>(initialDepartments);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "HIDDEN">("ALL");

  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SafeEmployeeProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<SafeEmployeeProfile | null>(null);

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createDeptId, setCreateDeptId] = useState("");
  const [createClientLimit, setCreateClientLimit] = useState<string>("0");
  const [createInvoiceLimit, setCreateInvoiceLimit] = useState<string>("0");
  const [createSalesLimit, setCreateSalesLimit] = useState<string>("0");
  const [createDescription, setCreateDescription] = useState("");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDeptId, setEditDeptId] = useState("");
  const [editClientLimit, setEditClientLimit] = useState<string>("0");
  const [editInvoiceLimit, setEditInvoiceLimit] = useState<string>("0");
  const [editSalesLimit, setEditSalesLimit] = useState<string>("0");
  const [editDescription, setEditDescription] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Feedback notification
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const refreshData = () => {
    startTransition(async () => {
      const res = await getEmployeeProfilesAction();
      if (res.success && res.profiles && res.departments) {
        setProfiles(res.profiles);
        setDepartments(res.departments);
      }
    });
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.departmentName.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));

      const matchesDept = departmentFilter === "ALL" || p.departmentId === departmentFilter;

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
          ? p.isActive
          : !p.isActive;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [profiles, searchQuery, departmentFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = profiles.length;
    const active = profiles.filter((p) => p.isActive).length;
    const hidden = total - active;
    const deptsCount = new Set(profiles.map((p) => p.departmentId)).size;
    return { total, active, hidden, deptsCount };
  }, [profiles]);

  // Open Create Modal
  const openCreateModal = () => {
    setCreateName("");
    setCreateDeptId(departments[0]?.id || "");
    setCreateClientLimit("0");
    setCreateInvoiceLimit("0");
    setCreateSalesLimit("0");
    setCreateDescription("");
    setCreateIsActive(true);
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmittingCreate(true);

    try {
      const res = await createEmployeeProfileAction({
        name: createName,
        departmentId: createDeptId,
        clientLimit: parseInt(createClientLimit, 10) || 0,
        invoiceLimit: parseInt(createInvoiceLimit, 10) || 0,
        salesLimit: parseInt(createSalesLimit, 10) || 0,
        description: createDescription,
        isActive: createIsActive,
      });

      if (!res.success) {
        setCreateError(res.error || "Failed to create employee profile.");
        setIsSubmittingCreate(false);
        return;
      }

      setIsCreateModalOpen(false);
      setFeedback({ type: "success", message: `Profile "${res.profile?.name}" created successfully!` });
      refreshData();
    } catch {
      setCreateError("An unexpected error occurred.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (profile: SafeEmployeeProfile) => {
    setEditingProfile(profile);
    setEditName(profile.name);
    setEditDeptId(profile.departmentId);
    setEditClientLimit(profile.clientLimit.toString());
    setEditInvoiceLimit(profile.invoiceLimit.toString());
    setEditSalesLimit(profile.salesLimit.toString());
    setEditDescription(profile.description || "");
    setEditIsActive(profile.isActive);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setEditError(null);
    setIsSubmittingEdit(true);

    try {
      const res = await updateEmployeeProfileAction({
        id: editingProfile.id,
        name: editName,
        departmentId: editDeptId,
        clientLimit: parseInt(editClientLimit, 10) || 0,
        invoiceLimit: parseInt(editInvoiceLimit, 10) || 0,
        salesLimit: parseInt(editSalesLimit, 10) || 0,
        description: editDescription,
        isActive: editIsActive,
      });

      if (!res.success) {
        setEditError(res.error || "Failed to update employee profile.");
        setIsSubmittingEdit(false);
        return;
      }

      setEditingProfile(null);
      setFeedback({ type: "success", message: `Profile "${res.profile?.name}" updated successfully!` });
      refreshData();
    } catch {
      setEditError("An unexpected error occurred.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteProfile = async (profile: SafeEmployeeProfile) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete profile "${profile.name}"?`
    );
    if (!confirmed) return;

    setActionLoadingId(profile.id);

    try {
      const res = await deleteEmployeeProfileAction(profile.id);
      if (res.success) {
        setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
        setFeedback({
          type: "success",
          message: `Profile "${profile.name}" deleted successfully.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to delete profile.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to delete profile." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (profile: SafeEmployeeProfile) => {
    setActionLoadingId(profile.id);
    const newStatus = !profile.isActive;

    try {
      const res = await toggleEmployeeProfileStatusAction(profile.id, newStatus);
      if (res.success) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === profile.id ? { ...p, isActive: newStatus } : p))
        );
        setFeedback({
          type: "success",
          message: `Profile "${profile.name}" marked as ${newStatus ? "Active" : "Hidden"}.`,
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to toggle profile status." });
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
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              Users & Governance
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-violet-600/10 dark:bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <UserCheck2 className="size-5" />
            </div>
            Employee Profiles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure employee working designations, department associations, and allocation limits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/departments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <Building2 className="size-3.5 text-violet-500" />
            Departments ({departments.length})
          </Link>
          <button
            onClick={refreshData}
            disabled={isPending}
            className="p-2 rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            title="Refresh profiles"
          >
            <RefreshCw className={`size-4 ${isPending ? "animate-spin text-violet-600" : ""}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="size-4" />
            Add Profile
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Profiles</div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Active Profiles</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.active}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Hidden Profiles</div>
          <div className="text-2xl font-bold tracking-tight text-slate-500 dark:text-slate-400 mt-1">
            {stats.hidden}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">Departments Active</div>
          <div className="text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400 mt-1">
            {stats.deptsCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-white/[0.08]">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by profile name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-white/[0.06]">
            {(["ALL", "ACTIVE", "HIDDEN"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  statusFilter === filter
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {filter === "ALL" ? "All" : filter === "ACTIVE" ? "Active" : "Hidden"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold w-10">#</th>
                <th className="py-3 px-4 font-semibold">Profile Name</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold text-center">Client Limit</th>
                <th className="py-3 px-4 font-semibold text-center">Invoice Limit</th>
                <th className="py-3 px-4 font-semibold text-center">Sales Limit</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Layers className="size-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No employee profiles found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 text-violet-700 dark:text-violet-300 font-semibold text-[11px]">
                        <Building2 className="size-3 text-violet-500" />
                        {p.departmentName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {p.description || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                      {p.clientLimit}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                      {p.invoiceLimit}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                      {p.salesLimit}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          p.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            p.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {p.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingProfile(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View profile details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit profile"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(p)}
                          disabled={actionLoadingId === p.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete profile"
                        >
                          {actionLoadingId === p.id ? (
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

      {/* Add Profile Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck2 className="size-4 text-violet-500" />
                Add Employee Profile
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

              {/* Department Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <Link
                    href="/admin/departments"
                    className="text-[11px] font-medium text-violet-600 hover:underline"
                  >
                    + Manage Departments
                  </Link>
                </div>
                <select
                  required
                  value={createDeptId}
                  onChange={(e) => setCreateDeptId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  <option value="" disabled>
                    -- Select Department --
                  </option>
                  {departments
                    .filter((d) => d.isActive)
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Profile Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Profile Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SBA, AFM, TL, BA, FM"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              {/* Limits Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Client Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createClientLimit}
                    onChange={(e) => setCreateClientLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Invoice Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createInvoiceLimit}
                    onChange={(e) => setCreateInvoiceLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sales Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createSalesLimit}
                    onChange={(e) => setCreateSalesLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Senior Business Analyst handling premium accounts"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              {/* Active / Hidden */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="createProfileIsActive"
                  checked={createIsActive}
                  onChange={(e) => setCreateIsActive(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500 size-4 cursor-pointer"
                />
                <label
                  htmlFor="createProfileIsActive"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Active Profile (uncheck to hide from selection)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                >
                  {isSubmittingCreate ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="size-4 text-violet-500" />
                Edit Profile
              </h3>
              <button
                onClick={() => setEditingProfile(null)}
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

              {/* Department Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} {!dept.isActive && "(Inactive)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profile Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Profile Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              {/* Limits Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Client Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editClientLimit}
                    onChange={(e) => setEditClientLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Invoice Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editInvoiceLimit}
                    onChange={(e) => setEditInvoiceLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sales Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editSalesLimit}
                    onChange={(e) => setEditSalesLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              {/* Active / Hidden */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editProfileIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500 size-4 cursor-pointer"
                />
                <label
                  htmlFor="editProfileIsActive"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Active Profile (uncheck to hide from selection)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                >
                  {isSubmittingEdit ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Profile Details Modal */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck2 className="size-4 text-violet-500" />
                Profile Details: {viewingProfile.name}
              </h3>
              <button
                onClick={() => setViewingProfile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/[0.06]">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Designation Name</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{viewingProfile.name}</div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    viewingProfile.isActive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      viewingProfile.isActive ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {viewingProfile.isActive ? "Active" : "Hidden"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/[0.06]">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                    <Building2 className="size-3.5 text-violet-500" />
                    Department
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {viewingProfile.departmentName}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/[0.06]">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                    <Users className="size-3.5 text-violet-500" />
                    Client Limit
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {viewingProfile.clientLimit}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/[0.06]">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                    <CreditCard className="size-3.5 text-violet-500" />
                    Invoice Limit
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {viewingProfile.invoiceLimit}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/[0.06]">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                    <TrendingUp className="size-3.5 text-violet-500" />
                    Sales Limit
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {viewingProfile.salesLimit}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Description</span>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {viewingProfile.description || "No description provided."}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                <span>Created: {new Date(viewingProfile.createdAt).toLocaleDateString()}</span>
                <span>Last Updated: {new Date(viewingProfile.updatedAt).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingProfile;
                    setViewingProfile(null);
                    openEditModal(toEdit);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProfile(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

