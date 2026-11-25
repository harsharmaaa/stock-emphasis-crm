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
  Search,
  Edit2,
  Trash2,
  Eye,
  Building2,
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
  const toast = useToast();
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
  const [deletingProfile, setDeletingProfile] = useState<SafeEmployeeProfile | null>(null);

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
      toast.success("Profile Created", `Profile "${res.profile?.name}" created successfully!`);
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
      toast.success("Profile Updated", `Profile "${res.profile?.name}" updated successfully!`);
      refreshData();
    } catch {
      setEditError("An unexpected error occurred.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProfile) return;
    setActionLoadingId(deletingProfile.id);

    try {
      const res = await deleteEmployeeProfileAction(deletingProfile.id);
      if (res.success) {
        setProfiles((prev) => prev.filter((p) => p.id !== deletingProfile.id));
        toast.success("Profile Deleted", `Profile "${deletingProfile.name}" deleted successfully.`);
        setDeletingProfile(null);
      } else {
        toast.error("Delete Failed", res.error || "Failed to delete profile.");
      }
    } catch {
      toast.error("Error", "Failed to delete profile.");
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
        toast.success(
          "Status Updated",
          `Profile "${profile.name}" marked as ${newStatus ? "Active" : "Hidden"}.`
        );
      } else {
        toast.error("Status Update Failed", res.error || "Failed to toggle profile status.");
      }
    } catch {
      toast.error("Error", "Failed to update status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Profiles & Designations</span>
            <Badge tone="info">
              {stats.total} {stats.total === 1 ? "Profile" : "Profiles"}
            </Badge>
          </div>
        }
        description="Configure employee designations, department associations, and operational allocation limits."
        breadcrumbs={[
          { label: "Governance", href: "/admin/users" },
          { label: "Profiles & Designations" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/admin/departments">
              <Button variant="sec" size="sm">
                <Building2 className="size-4" />
                Departments ({departments.length})
              </Button>
            </Link>
            <Button
              variant="sec"
              size="sm"
              icon="RefreshCw"
              loading={isPending}
              onClick={refreshData}
              aria-label="Refresh profiles"
            />
            <Button variant="primary" size="sm" leftIcon="Plus" onClick={openCreateModal}>
              Add Profile
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="text-[11px] font-semibold text-[var(--muted)]">Total Profiles</div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Active Profiles</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.active}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold text-[var(--muted)]">Hidden Profiles</div>
          <div className="text-2xl font-bold tracking-tight text-slate-500 dark:text-slate-400 mt-1">
            {stats.hidden}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold text-[var(--brand)]">Departments Active</div>
          <div className="text-2xl font-bold tracking-tight text-[var(--brand)] mt-1">
            {stats.deptsCount}
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)]" />
              <Input
                type="text"
                placeholder="Search profiles or departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Department Filter */}
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs h-8 min-w-[140px]"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Status Filter */}
          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06] shrink-0 self-start sm:self-auto">
            {(["ALL", "ACTIVE", "HIDDEN"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
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
      </Card>

      {/* Profiles Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold w-12">#</th>
                <th className="py-3 px-4 font-semibold">Profile / Designation</th>
                <th className="py-3 px-4 font-semibold">Department</th>
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
                  <td colSpan={8} className="py-8">
                    <EmptyState
                      icon="Inbox"
                      title="No Profiles Found"
                      description="No employee designations match your search query or department filter."
                      actionLabel="Add Profile"
                      actionIcon="Plus"
                      onAction={openCreateModal}
                    />
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        <Building2 className="size-3 text-[var(--muted)]" />
                        {p.departmentName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">{p.clientLimit}</td>
                    <td className="py-3.5 px-4 text-center font-mono">{p.invoiceLimit}</td>
                    <td className="py-3.5 px-4 text-center font-mono">{p.salesLimit}</td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p)}
                        disabled={actionLoadingId === p.id}
                        className="cursor-pointer"
                        title="Click to toggle status"
                      >
                        <Badge tone={p.isActive ? "ok" : "warn"} dot>
                          {p.isActive ? "Active" : "Hidden"}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setViewingProfile(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View profile details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit profile"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProfile(p)}
                          disabled={actionLoadingId === p.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete profile"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
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
        open={Boolean(deletingProfile)}
        onClose={() => setDeletingProfile(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Profile / Designation"
        description={
          deletingProfile
            ? `Are you sure you want to delete profile "${deletingProfile.name}"? If users are assigned to this profile, their profile reference will be cleared safely.`
            : ""
        }
        confirmText="Delete Profile"
        tone="danger"
        loading={actionLoadingId === deletingProfile?.id}
      />

      {/* Create Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Employee Profile / Designation"
        description="Configure designation name, parent department, and operational caps."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div role="alert" className="p-3 rounded-xl bg-[var(--err)]/10 text-[var(--err)] text-xs font-medium">
              {createError}
            </div>
          )}

          <Field label="Profile / Designation Name" required>
            <Input
              type="text"
              placeholder="e.g. Senior Business Associate"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
            />
          </Field>

          <Field label="Parent Department" required>
            <Select
              value={createDeptId}
              onChange={(e) => setCreateDeptId(e.target.value)}
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Client Limit">
              <Input
                type="number"
                min="0"
                value={createClientLimit}
                onChange={(e) => setCreateClientLimit(e.target.value)}
              />
            </Field>
            <Field label="Invoice Limit">
              <Input
                type="number"
                min="0"
                value={createInvoiceLimit}
                onChange={(e) => setCreateInvoiceLimit(e.target.value)}
              />
            </Field>
            <Field label="Sales Limit">
              <Input
                type="number"
                min="0"
                value={createSalesLimit}
                onChange={(e) => setCreateSalesLimit(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Description / Notes">
            <Textarea
              rows={2}
              placeholder="Responsibilities, scope or designation notes..."
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="sec" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isSubmittingCreate}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      {editingProfile && (
        <Modal
          open={Boolean(editingProfile)}
          onClose={() => setEditingProfile(null)}
          title={`Edit Profile: ${editingProfile.name}`}
          size="md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div role="alert" className="p-3 rounded-xl bg-[var(--err)]/10 text-[var(--err)] text-xs font-medium">
                {editError}
              </div>
            )}

            <Field label="Profile / Designation Name" required>
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </Field>

            <Field label="Parent Department" required>
              <Select
                value={editDeptId}
                onChange={(e) => setEditDeptId(e.target.value)}
                required
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Client Limit">
                <Input
                  type="number"
                  min="0"
                  value={editClientLimit}
                  onChange={(e) => setEditClientLimit(e.target.value)}
                />
              </Field>
              <Field label="Invoice Limit">
                <Input
                  type="number"
                  min="0"
                  value={editInvoiceLimit}
                  onChange={(e) => setEditInvoiceLimit(e.target.value)}
                />
              </Field>
              <Field label="Sales Limit">
                <Input
                  type="number"
                  min="0"
                  value={editSalesLimit}
                  onChange={(e) => setEditSalesLimit(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Description / Notes">
              <Textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </Field>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="sec" size="sm" onClick={() => setEditingProfile(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={isSubmittingEdit}>
                Update Profile
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {viewingProfile && (
        <Modal
          open={Boolean(viewingProfile)}
          onClose={() => setViewingProfile(null)}
          title={`Profile Details: ${viewingProfile.name}`}
          size="md"
          footer={
            <Button variant="sec" size="sm" onClick={() => setViewingProfile(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Department</span>
                <span className="font-semibold">{viewingProfile.departmentName}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Status</span>
                <Badge tone={viewingProfile.isActive ? "ok" : "warn"} dot>
                  {viewingProfile.isActive ? "Active" : "Hidden"}
                </Badge>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Client Limit</span>
                <span className="font-mono font-semibold">{viewingProfile.clientLimit}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Invoice Limit</span>
                <span className="font-mono font-semibold">{viewingProfile.invoiceLimit}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Sales Limit</span>
                <span className="font-mono font-semibold">{viewingProfile.salesLimit}</span>
              </div>
            </div>

            {viewingProfile.description && (
              <div>
                <span className="text-[10px] text-[var(--muted)] block mb-1">Description</span>
                <p className="p-3 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
                  {viewingProfile.description}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
