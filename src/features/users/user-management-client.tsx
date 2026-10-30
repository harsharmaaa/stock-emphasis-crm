"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import type { SafeUser } from "./actions";
import {
  getUsersAction,
  deleteUserAction,
} from "./actions";
import {
  Users,
  Search,
  UserPlus,
  Building2,
  Briefcase,
  CheckCircle2,
  XCircle,
  Edit2,
  Eye,
  Trash2,
  RefreshCw,
  AlertCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Target,
  FileText,
  UserCheck2,
} from "lucide-react";

interface UserManagementClientProps {
  initialUsers: SafeUser[];
  initialTotalCount: number;
  initialTotalPages: number;
  currentAdminId: string;
}

export function UserManagementClient({
  initialUsers,
  initialTotalCount,
  initialTotalPages,
  currentAdminId,
}: UserManagementClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<SafeUser[]>(initialUsers);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Loading transitions
  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // View modal state
  const [viewingUser, setViewingUser] = useState<SafeUser | null>(null);

  // Alert feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch / refresh users
  const fetchUsers = (
    page: number = currentPage,
    search: string = searchQuery,
    role: "ALL" | Role = roleFilter,
    status: "ALL" | "ACTIVE" | "INACTIVE" = statusFilter
  ) => {
    startTransition(async () => {
      const res = await getUsersAction({
        page,
        pageSize: 10,
        search,
        role,
        status,
      });

      if (res.success && res.data) {
        setUsers(res.data.users);
        setTotalCount(res.data.totalCount);
        setTotalPages(res.data.totalPages);
        setCurrentPage(res.data.currentPage);
      } else if (res.error) {
        setFeedback({ type: "error", message: res.error });
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, searchQuery, roleFilter, statusFilter);
  };

  const handleRoleChange = (newRole: "ALL" | Role) => {
    setRoleFilter(newRole);
    fetchUsers(1, searchQuery, newRole, statusFilter);
  };

  const handleStatusChange = (newStatus: "ALL" | "ACTIVE" | "INACTIVE") => {
    setStatusFilter(newStatus);
    fetchUsers(1, searchQuery, roleFilter, newStatus);
  };

  // Safe soft-delete employee handler
  const handleDeleteEmployee = async (u: SafeUser) => {
    const isSelf = u.id === currentAdminId;
    if (isSelf) {
      alert("Security restriction: You cannot delete your own Administrator account.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete employee "${u.name}" (@${u.username || u.email})?\n\nThis will safely archive their account. All historical leads, activity logs, and audit records will remain preserved.`
    );
    if (!confirmed) return;

    setActionLoadingId(u.id);
    try {
      const res = await deleteUserAction(u.id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Employee "${u.name}" deleted and archived successfully.`,
        });
        fetchUsers();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to delete employee.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to delete employee due to network error." });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              EMPLOYEE
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
              {totalCount} {totalCount === 1 ? "Employee" : "Employees"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Directory of CRM staff, profile designations, calling extensions, targets, and lead fetch permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchUsers()}
            disabled={isPending}
            className="p-2.5 rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            title="Refresh list"
          >
            <RefreshCw className={`size-4 ${isPending ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <Link
            href="/admin/users/add"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs transition-all active:scale-[0.98]"
          >
            <UserPlus className="size-4" />
            <span>Add Employee</span>
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in duration-200 ${
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, username, email, extension, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-white/[0.06]">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => handleStatusChange(filter)}
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

          {/* System Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value as "ALL" | Role)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="EMPLOYEE">EMPLOYEE</option>
          </select>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold w-12">#</th>
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Profile</th>
                <th className="py-3 px-4 font-semibold">Reporting</th>
                <th className="py-3 px-4 font-semibold">Username</th>
                <th className="py-3 px-4 font-semibold">Extension</th>
                <th className="py-3 px-4 font-semibold">Target</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="size-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No employee accounts found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => {
                  const rowNumber = (currentPage - 1) * 10 + idx + 1;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* # */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{rowNumber}</td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                          {u.email}
                        </div>
                      </td>

                      {/* Profile (Designation) */}
                      <td className="py-3.5 px-4">
                        {u.employeeProfileName ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                            <UserCheck2 className="size-3 text-blue-500" />
                            {u.employeeProfileName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Reporting Manager */}
                      <td className="py-3.5 px-4">
                        {u.managerName ? (
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            {u.managerName}
                            {u.managerProfileName && (
                              <span className="text-slate-400 text-[11px] ml-1">
                                ({u.managerProfileName})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Direct Report</span>
                        )}
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {u.username ? `@${u.username}` : "—"}
                      </td>

                      {/* Extension */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {u.callingExtension || "—"}
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4 font-mono text-slate-800 dark:text-slate-200">
                        {u.employeeTarget ? `₹${u.employeeTarget.toLocaleString("en-IN")}` : "0"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.isActive
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              u.isActive ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {u.isActive ? "Active" : "Deactive"}
                        </span>
                      </td>

                      {/* Actions: View, Edit, Delete (Strictly three actions only) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* 1. View */}
                          <button
                            type="button"
                            onClick={() => setViewingUser(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View employee details"
                          >
                            <Eye className="size-3.5" />
                          </button>

                          {/* 2. Edit */}
                          <Link
                            href={`/admin/users/${u.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit employee"
                          >
                            <Edit2 className="size-3.5" />
                          </Link>

                          {/* 3. Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(u)}
                            disabled={actionLoadingId === u.id || u.id === currentAdminId}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.id === currentAdminId
                                ? "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                                : "text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            }`}
                            title={u.id === currentAdminId ? "Cannot delete self" : "Delete employee"}
                          >
                            {actionLoadingId === u.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 border-t border-slate-200/80 dark:border-white/[0.08] text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fetchUsers(currentPage - 1)}
                disabled={currentPage <= 1 || isPending}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => fetchUsers(currentPage + 1)}
                disabled={currentPage >= totalPages || isPending}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* READ-ONLY VIEW EMPLOYEE MODAL (REQUIREMENT 6)                   */}
      {/* ============================================================== */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  {viewingUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{viewingUser.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        viewingUser.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {viewingUser.isActive ? "Active" : "Deactive"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {viewingUser.username ? `@${viewingUser.username}` : viewingUser.email} • {viewingUser.role}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Basic Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-slate-400">
                  Basic Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Mobile</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.mobile || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Father&apos;s Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.fatherName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Email</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{viewingUser.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">State</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.state || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">City</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.city || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Date of Birth</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.dob || "—"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-[10px] text-slate-400 block">Address</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewingUser.address || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Department & Designation */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-slate-400">
                  Department & Working Profile
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Department</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.departmentName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Profile / Designation</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{viewingUser.employeeProfileName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Reporting Manager</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.managerName || "None"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Calling Extension</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{viewingUser.callingExtension || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Target</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {viewingUser.employeeTarget ? `₹${viewingUser.employeeTarget.toLocaleString("en-IN")}` : "0"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Past Experience</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.pastExperience || "Not Started"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Joining Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.joiningDate || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Lead Fetch Permissions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-slate-400">
                  Lead Fetch Permissions ({viewingUser.leadFetchSources.length})
                </h4>
                {viewingUser.leadFetchSources.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                    No lead fetch permissions assigned. This employee cannot fetch leads.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 p-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                    {viewingUser.leadFetchSources.map((source) => (
                      <span
                        key={source}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-medium"
                      >
                        <ShieldCheck className="size-3 text-blue-500" />
                        {source}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              {viewingUser.description && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-slate-400">
                    Description / Notes
                  </h4>
                  <p className="p-3 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06] text-slate-700 dark:text-slate-300">
                    {viewingUser.description}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
              <span className="text-[11px] text-slate-400">
                Created on {new Date(viewingUser.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/users/${viewingUser.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs"
                >
                  <Edit2 className="size-3.5" />
                  Edit Employee
                </Link>
                <button
                  type="button"
                  onClick={() => setViewingUser(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
