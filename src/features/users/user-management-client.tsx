"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import type { SafeUser } from "./actions";
import {
  createUserAction,
  updateUserAction,
  toggleUserStatusAction,
  getUsersAction,
} from "./actions";
import {
  Users,
  Search,
  UserPlus,
  ShieldCheck,
  Briefcase,
  Boxes,
  CheckCircle2,
  XCircle,
  Edit2,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
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

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);

  // Form states for Create Modal
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<Role>("EMPLOYEE");
  const [createPassword, setCreatePassword] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Form states for Edit Modal
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("EMPLOYEE");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Refresh or fetch with current filters and page
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

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchUsers(newPage, searchQuery, roleFilter, statusFilter);
  };

  // Open Edit Modal
  const openEditModal = (user: SafeUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword("");
    setEditError(null);
  };

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setIsSubmittingCreate(true);

    try {
      const res = await createUserAction({
        name: createName,
        email: createEmail,
        role: createRole,
        temporaryPassword: createPassword,
      });

      if (!res.success) {
        setCreateError(res.error ?? "Failed to create user account.");
        setIsSubmittingCreate(false);
        return;
      }

      setCreateSuccess(`Account for "${res.user?.name}" created successfully!`);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("EMPLOYEE");

      // Reload users list
      fetchUsers(1);

      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccess(null);
      }, 1200);
    } catch {
      setCreateError("An unexpected network error occurred.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setIsSubmittingEdit(true);

    try {
      const res = await updateUserAction({
        userId: editingUser.id,
        name: editName,
        email: editEmail,
        role: editRole,
        newPassword: editPassword.trim() || undefined,
      });

      if (!res.success) {
        setEditError(res.error ?? "Failed to update user.");
        setIsSubmittingEdit(false);
        return;
      }

      // Close modal and refresh list
      setEditingUser(null);
      fetchUsers(currentPage);
    } catch {
      setEditError("An unexpected network error occurred.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (user: SafeUser) => {
    if (user.id === currentAdminId) {
      alert("Security restriction: You cannot deactivate your own active Administrator account.");
      return;
    }

    const actionVerb = user.isActive ? "deactivate" : "reactivate";
    const confirmed = window.confirm(
      `Are you sure you want to ${actionVerb} the account for ${user.name} (${user.email})?`
    );
    if (!confirmed) return;

    setActionLoadingId(user.id);

    try {
      const res = await toggleUserStatusAction(user.id);
      if (!res.success) {
        alert(res.error ?? "Failed to change user status.");
        return;
      }

      // Update state locally
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: res.newStatus ?? !u.isActive } : u
        )
      );
    } catch {
      alert("An unexpected network error occurred.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              User Management
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              {totalCount} {totalCount === 1 ? "User" : "Users"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Provision, inspect, and govern personnel credentials and role privileges.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchUsers()}
            disabled={isPending}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh user directory"
          >
            <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => {
              setCreateError(null);
              setCreateSuccess(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="size-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </form>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="size-3.5" />
            <span>Filters:</span>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value as "ALL" | Role)}
            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin Only</option>
            <option value="MANAGER">Manager Only</option>
            <option value="EMPLOYEE">Employee Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              handleStatusChange(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
            }
            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4 sm:px-6">User / Identity</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Created At</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {isPending && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="size-6 animate-spin mx-auto text-purple-400 mb-2" />
                    <span>Loading directory records...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="size-8 mx-auto text-slate-400 mb-2" />
                    <p className="font-medium text-slate-300">No matching users found.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try adjusting your search terms or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentAdminId;
                  const isLoadingAction = actionLoadingId === u.id;

                  const roleBadgeClass =
                    u.role === "ADMIN"
                      ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                      : u.role === "MANAGER"
                      ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

                  const RoleIcon =
                    u.role === "ADMIN"
                      ? ShieldCheck
                      : u.role === "MANAGER"
                      ? Briefcase
                      : Boxes;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center size-9 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700/80 shrink-0">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white truncate">
                                {u.name}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-slate-400 text-[11px] truncate block">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${roleBadgeClass}`}
                        >
                          <RoleIcon className="size-3" />
                          <span>{u.role}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <span className="size-1.5 rounded-full bg-rose-400" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-400 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="size-4" />
                          </button>

                          {/* Toggle Status Button */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf || isLoadingAction}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSelf
                                ? "text-slate-600 cursor-not-allowed"
                                : u.isActive
                                ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            }`}
                            title={
                              isSelf
                                ? "You cannot deactivate your own admin account"
                                : u.isActive
                                ? "Deactivate Account"
                                : "Reactivate Account"
                            }
                          >
                            {isLoadingAction ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : u.isActive ? (
                              <XCircle className="size-4" />
                            ) : (
                              <CheckCircle2 className="size-4" />
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
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{users.length}</strong> of{" "}
            <strong className="text-white">{totalCount}</strong> recorded accounts
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

      {/* CREATE USER MODAL */}
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
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create New Account</h2>
                <p className="text-xs text-slate-400">
                  Provision an operator account with a temporary password
                </p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Mercer"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex.mercer@stockemphasis.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Assigned Role
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 transition-all"
                >
                  <option value="EMPLOYEE">EMPLOYEE (Warehouse & Stock Ops)</option>
                  <option value="MANAGER">MANAGER (Operations Supervisor)</option>
                  <option value="ADMIN">ADMIN (System Administrator)</option>
                </select>
              </div>

              {/* Temporary Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Initial Password
                  </label>
                  <span className="text-[11px] text-slate-400">Min. 6 chars</span>
                </div>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Enter temporary password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showCreatePassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 relative text-slate-100">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Edit2 className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Edit User Profile</h2>
                <p className="text-xs text-slate-400">
                  Update role permissions or reset credentials
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
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Role Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Role Privilege
                  </label>
                  {editingUser.id === currentAdminId && (
                    <span className="text-[10px] text-purple-400 font-medium">
                      Cannot demote yourself
                    </span>
                  )}
                </div>
                <select
                  value={editRole}
                  disabled={editingUser.id === currentAdminId}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              {/* Password Reset (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Lock className="size-3.5 text-slate-400" />
                    <span>Reset Password</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Leave blank to keep current</span>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    placeholder="Enter new password (optional)"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showEditPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all disabled:opacity-50"
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
    </div>
  );
}
