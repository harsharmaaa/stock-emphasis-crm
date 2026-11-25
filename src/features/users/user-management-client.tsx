"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import type { SafeUser } from "./actions";
import { getUsersAction, deleteUserAction } from "./actions";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  Pagination,
  EmptyState,
  useToast,
} from "@/src/components/ui";
import {
  Search,
  Eye,
  Edit2,
  Trash2,
  UserCheck2,
  ShieldCheck,
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
  const toast = useToast();
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

  // Delete confirm dialog state
  const [deletingUser, setDeletingUser] = useState<SafeUser | null>(null);

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
        toast.error("Failed to load users", res.error);
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

  // Safe soft-delete employee initiation
  const handleDeleteClick = (u: SafeUser) => {
    if (u.id === currentAdminId) {
      toast.error(
        "Security restriction",
        "You cannot delete your own Administrator account."
      );
      return;
    }
    setDeletingUser(u);
  };

  // Confirmed soft-delete execution
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setActionLoadingId(deletingUser.id);
    try {
      const res = await deleteUserAction(deletingUser.id);
      if (res.success) {
        toast.success(
          "Employee Archived",
          `Employee "${deletingUser.name}" was safely deleted and archived.`
        );
        setDeletingUser(null);
        fetchUsers();
      } else {
        toast.error("Action Failed", res.error || "Failed to delete employee.");
      }
    } catch {
      toast.error("Network Error", "Failed to delete employee due to connection failure.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Employee Directory</span>
            <Badge tone="info">
              {totalCount} {totalCount === 1 ? "Employee" : "Employees"}
            </Badge>
          </div>
        }
        description="Directory of CRM staff, profile designations, calling extensions, targets, and lead fetch permissions."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="sec"
              size="sm"
              icon="RefreshCw"
              loading={isPending}
              onClick={() => fetchUsers()}
              aria-label="Refresh list"
            />
            <Link href="/admin/users/add">
              <Button variant="primary" size="sm" leftIcon="UserPlus">
                Add Employee
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)]" />
            <Input
              type="text"
              placeholder="Search by name, username, email, extension, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06]">
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => handleStatusChange(filter)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
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
            <Select
              value={roleFilter}
              onChange={(e) => handleRoleChange(e.target.value as "ALL" | Role)}
              className="text-xs h-8 min-w-[120px]"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Employee List Table */}
      <Card className="overflow-hidden p-0">
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
                  <td colSpan={9} className="py-8">
                    <EmptyState
                      icon="Users"
                      title="No Employees Found"
                      description="No employee accounts match your search query or filter criteria."
                      actionLabel="Add Employee"
                      actionIcon="Plus"
                      onAction={() => window.location.assign("/admin/users/add")}
                    />
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[var(--brand-soft)]/20 border border-[var(--brand)]/30 text-[var(--brand)] font-semibold text-[11px]">
                            <UserCheck2 className="size-3 text-[var(--brand)]" />
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
                        <Badge tone={u.isActive ? "ok" : "err"} dot>
                          {u.isActive ? "Active" : "Deactive"}
                        </Badge>
                      </td>

                      {/* Actions: View, Edit, Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setViewingUser(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View employee details"
                            aria-label={`View ${u.name}`}
                          >
                            <Eye className="size-3.5" />
                          </button>

                          <Link
                            href={`/admin/users/${u.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block"
                            title="Edit employee"
                            aria-label={`Edit ${u.name}`}
                          >
                            <Edit2 className="size-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteClick(u)}
                            disabled={actionLoadingId === u.id || u.id === currentAdminId}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              u.id === currentAdminId
                                ? "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                                : "text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            }`}
                            title={u.id === currentAdminId ? "Cannot delete self" : "Delete employee"}
                            aria-label={`Delete ${u.name}`}
                          >
                            <Trash2 className="size-3.5" />
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
          <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 border-t border-slate-200/80 dark:border-white/[0.08] text-xs gap-3">
            <span className="text-[var(--muted)]">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </span>
            <Pagination
              page={currentPage}
              pages={totalPages}
              onChange={(p) => fetchUsers(p)}
            />
          </div>
        )}
      </Card>

      {/* Confirmation Dialog for Soft Delete */}
      <ConfirmDialog
        open={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleConfirmDelete}
        title="Archive Employee"
        description={
          deletingUser
            ? `Are you sure you want to delete employee "${deletingUser.name}" (@${deletingUser.username || deletingUser.email})? This will safely archive their account. All historical leads, activity logs, and audit records will remain preserved.`
            : ""
        }
        confirmText="Archive Employee"
        tone="danger"
        loading={actionLoadingId === deletingUser?.id}
      />

      {/* Read-Only View Employee Modal */}
      {viewingUser && (
        <Modal
          open={Boolean(viewingUser)}
          onClose={() => setViewingUser(null)}
          title={
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[var(--brand-soft)]/20 text-[var(--brand)] flex items-center justify-center font-bold text-sm">
                {viewingUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {viewingUser.name}
                  </span>
                  <Badge tone={viewingUser.isActive ? "ok" : "err"} dot>
                    {viewingUser.isActive ? "Active" : "Deactive"}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {viewingUser.username ? `@${viewingUser.username}` : viewingUser.email} • {viewingUser.role}
                </p>
              </div>
            </div>
          }
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-[var(--muted)]">
                Created on {new Date(viewingUser.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <div className="flex items-center gap-2">
                <Link href={`/admin/users/${viewingUser.id}/edit`}>
                  <Button variant="primary" size="sm" leftIcon="Pencil">
                    Edit Employee
                  </Button>
                </Link>
                <Button variant="sec" size="sm" onClick={() => setViewingUser(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            {/* Basic Details */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Department & Working Profile
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                <div>
                  <span className="text-[10px] text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.departmentName || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Profile / Designation</span>
                  <span className="font-semibold text-[var(--brand)]">{viewingUser.employeeProfileName || "—"}</span>
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
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--brand-soft)]/20 border border-[var(--brand)]/30 text-[var(--brand)] text-[11px] font-medium"
                    >
                      <ShieldCheck className="size-3 text-[var(--brand)]" />
                      {source}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            {viewingUser.description && (
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Description / Notes
                </h4>
                <p className="p-3 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06] text-slate-700 dark:text-slate-300">
                  {viewingUser.description}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
