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
  PageHeader,
  Card,
  Button,
  Badge,
  Modal,
  ConfirmDialog,
  Field,
  Input,
  EmptyState,
  useToast,
} from "@/src/components/ui";
import {
  Search,
  Edit2,
  Trash2,
  FolderTree,
  Briefcase,
} from "lucide-react";

interface DepartmentsClientProps {
  initialDepartments: SafeDepartment[];
}

export function DepartmentsClient({ initialDepartments }: DepartmentsClientProps) {
  const toast = useToast();
  const [departments, setDepartments] = useState<SafeDepartment[]>(initialDepartments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<SafeDepartment | null>(null);
  const [deletingDept, setDeletingDept] = useState<SafeDepartment | null>(null);

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
      toast.success("Department Created", `Department "${res.department?.name}" created successfully!`);
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
      toast.success("Department Updated", `Department "${res.department?.name}" updated successfully!`);
      refreshData();
    } catch {
      setEditError("An unexpected error occurred.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDept) return;
    setActionLoadingId(deletingDept.id);

    try {
      const res = await deleteDepartmentAction(deletingDept.id);
      if (res.success) {
        setDepartments((prev) => prev.filter((d) => d.id !== deletingDept.id));
        toast.success("Department Deleted", `Department "${deletingDept.name}" deleted successfully.`);
        setDeletingDept(null);
      } else {
        toast.error("Delete Blocked", res.error || "Failed to delete department.");
      }
    } catch {
      toast.error("Error", "Failed to delete department.");
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
        toast.success(
          "Status Updated",
          `Department "${dept.name}" ${newStatus ? "activated" : "deactivated"} successfully.`
        );
      } else {
        toast.error("Status Failed", res.error || "Failed to change department status.");
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
            <span>Department Management</span>
            <Badge tone="info">
              {stats.total} {stats.total === 1 ? "Department" : "Departments"}
            </Badge>
          </div>
        }
        description="Manage company departments and structural units. Employee designations and profiles reference these departments."
        breadcrumbs={[
          { label: "Governance", href: "/admin/users" },
          { label: "Departments" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/admin/profiles">
              <Button variant="sec" size="sm">
                <Briefcase className="size-4" />
                Profiles ({stats.totalProfilesAssigned})
              </Button>
            </Link>
            <Button
              variant="sec"
              size="sm"
              icon="RefreshCw"
              loading={isPending}
              onClick={refreshData}
              aria-label="Refresh departments"
            />
            <Button
              variant="primary"
              size="sm"
              leftIcon="Plus"
              onClick={() => {
                setCreateError(null);
                setCreateName("");
                setCreateIsActive(true);
                setIsCreateModalOpen(true);
              }}
            >
              Add Department
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="text-[11px] font-semibold text-[var(--muted)]">Total Departments</div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Active Units</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.active}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold text-[var(--muted)]">Inactive Units</div>
          <div className="text-2xl font-bold tracking-tight text-slate-500 dark:text-slate-400 mt-1">
            {stats.inactive}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold text-[var(--brand)]">Linked Profiles</div>
          <div className="text-2xl font-bold tracking-tight text-[var(--brand)] mt-1">
            {stats.totalProfilesAssigned}
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)]" />
            <Input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06] shrink-0 self-start sm:self-auto">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((filter) => (
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
                {filter === "ALL" ? "All" : filter === "ACTIVE" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Departments Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold w-12">#</th>
                <th className="py-3 px-4 font-semibold">Department Name</th>
                <th className="py-3 px-4 font-semibold">Profiles Linked</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState
                      icon="Inbox"
                      title="No Departments Found"
                      description="No company departments match your search query."
                      actionLabel="Add Department"
                      actionIcon="Plus"
                      onAction={() => {
                        setCreateError(null);
                        setCreateName("");
                        setCreateIsActive(true);
                        setIsCreateModalOpen(true);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept, idx) => (
                  <tr
                    key={dept.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {dept.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        <FolderTree className="size-3 text-[var(--muted)]" />
                        {dept.profilesCount} {dept.profilesCount === 1 ? "profile" : "profiles"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(dept)}
                        disabled={actionLoadingId === dept.id}
                        className="cursor-pointer"
                        title="Click to toggle status"
                      >
                        <Badge tone={dept.isActive ? "ok" : "warn"} dot>
                          {dept.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => openEditModal(dept)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit department"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingDept(dept)}
                          disabled={actionLoadingId === dept.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete department"
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
        open={Boolean(deletingDept)}
        onClose={() => setDeletingDept(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Department"
        description={
          deletingDept
            ? `Are you sure you want to delete department "${deletingDept.name}"? This operation will be rejected if profiles are still linked to it.`
            : ""
        }
        confirmText="Delete Department"
        tone="danger"
        loading={actionLoadingId === deletingDept?.id}
      />

      {/* Create Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Department"
        description="Add a new company operational unit or department."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div role="alert" className="p-3 rounded-xl bg-[var(--err)]/10 text-[var(--err)] text-xs font-medium">
              {createError}
            </div>
          )}

          <Field label="Department Name" required>
            <Input
              type="text"
              placeholder="e.g. Sales & Research"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
            />
          </Field>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="sec" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isSubmittingCreate}>
              Save Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      {editingDept && (
        <Modal
          open={Boolean(editingDept)}
          onClose={() => setEditingDept(null)}
          title={`Edit Department: ${editingDept.name}`}
          size="md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div role="alert" className="p-3 rounded-xl bg-[var(--err)]/10 text-[var(--err)] text-xs font-medium">
                {editError}
              </div>
            )}

            <Field label="Department Name" required>
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </Field>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="sec" size="sm" onClick={() => setEditingDept(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={isSubmittingEdit}>
                Update Department
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
