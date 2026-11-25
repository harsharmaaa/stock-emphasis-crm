"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Search,
  Edit2,
  Trash2,
  Radio,
  RotateCcw,
} from "lucide-react";
import { LeadSourceModal } from "./lead-source-modal";
import { deleteLeadSourceAction, reactivateLeadSourceAction } from "./actions";
import type { LeadSourceItem } from "./types";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Input,
  ConfirmDialog,
  EmptyState,
  useToast,
} from "@/src/components/ui";

interface LeadSourcesClientProps {
  initialSources: LeadSourceItem[];
}

export function LeadSourcesClient({ initialSources }: LeadSourcesClientProps) {
  const [sources, setSources] = useState<LeadSourceItem[]>(initialSources);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSourceItem | null>(null);

  // Deactivate State
  const [deactivatingSource, setDeactivatingSource] = useState<LeadSourceItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Reactivate State
  const [isReactivating, setIsReactivating] = useState(false);

  const toast = useToast();

  // Filter sources by search query
  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return sources;
    const q = searchQuery.toLowerCase().trim();
    return sources.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        s.createdByName.toLowerCase().includes(q)
    );
  }, [sources, searchQuery]);

  const handleOpenAdd = () => {
    setEditingSource(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (src: LeadSourceItem) => {
    setEditingSource(src);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = (saved: LeadSourceItem) => {
    setSources((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    toast.success("Saved successfully", `Lead Source "${saved.name}" saved successfully.`);
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivatingSource) return;
    setIsDeactivating(true);
    try {
      const res = await deleteLeadSourceAction(deactivatingSource.id);
      if (res.success) {
        setSources((prev) =>
          prev.map((s) => (s.id === deactivatingSource.id ? { ...s, isActive: false } : s))
        );
        toast.success("Deactivated", `Lead Source "${deactivatingSource.name}" deactivated.`);
        setDeactivatingSource(null);
      } else {
        toast.error("Deactivation failed", res.error || "Failed to deactivate lead source.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Error", message);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async (src: LeadSourceItem) => {
    setIsReactivating(true);
    try {
      const res = await reactivateLeadSourceAction(src.id);
      if (res.success) {
        setSources((prev) =>
          prev.map((s) => (s.id === src.id ? { ...s, isActive: true } : s))
        );
        toast.success("Reactivated", `Lead Source "${src.name}" reactivated successfully.`);
      } else {
        toast.error("Reactivation failed", res.error || "Failed to reactivate lead source.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Error", message);
    } finally {
      setIsReactivating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="LEAD SOURCE"
        description="Configure marketing channels, lead generation sources, and origin categories."
        actions={
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              leftIcon="Plus"
              onClick={handleOpenAdd}
            >
              Add
            </Button>

            <Link href="/admin/settings/configuration">
              <Button
                variant="danger"
                size="sm"
              >
                <ArrowLeft className="size-3.5" />
                Go Back
              </Button>
            </Link>
          </div>
        }
      />

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lead sources..."
            className="pl-9"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Table Container */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/20">
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground w-12 text-center">
                  #
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground">
                  Name
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground">
                  Description
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground">
                  Added By
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground text-right pr-6">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredSources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState
                      icon="Inbox"
                      title="No lead sources found"
                      description={
                        sources.length === 0
                          ? 'Master list is currently empty. Click "Add" above to create your first source.'
                          : "No sources match your search query."
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredSources.map((src, index) => (
                  <tr
                    key={src.id}
                    className={`transition-colors group ${
                      !src.isActive
                        ? "opacity-60 bg-muted/20"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground text-center">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{src.name}</span>
                        {!src.isActive && (
                          <Badge tone="warn">
                            Deactivated
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground max-w-xs truncate">
                      {src.description || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground">
                      {src.createdByName}
                    </td>
                    <td className="py-3.5 px-4 text-right pr-6">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1.5 h-auto text-emerald-600 dark:text-emerald-400"
                          onClick={() => handleOpenEdit(src)}
                          title="Edit Lead Source"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        {src.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 h-auto text-rose-600 dark:text-rose-400"
                            onClick={() => setDeactivatingSource(src)}
                            title="Deactivate Lead Source"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 h-auto text-brand"
                            onClick={() => handleReactivate(src)}
                            loading={isReactivating}
                            title="Reactivate Lead Source"
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-border/70 text-center text-[11px] text-muted-foreground">
          © Stock Emphasis v4.2.0. All rights reserved.
        </div>
      </Card>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <LeadSourceModal
          source={editingSource}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSaveSuccess}
        />
      )}

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deactivatingSource)}
        onClose={() => setDeactivatingSource(null)}
        onConfirm={handleDeactivateConfirm}
        title="Deactivate Lead Source"
        description={
          deactivatingSource ? (
            <span>
              Deactivating <strong className="text-foreground">{deactivatingSource.name}</strong> will hide it from new lead entry dropdowns and employee assignment forms. Existing leads, fetch permissions, and history will be preserved.
            </span>
          ) : undefined
        }
        confirmText="Deactivate"
        cancelText="Cancel"
        tone="danger"
        loading={isDeactivating}
      />
    </div>
  );
}

