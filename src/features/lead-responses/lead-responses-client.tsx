"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { LeadResponseModal } from "./lead-response-modal";
import { deleteLeadResponseAction, reactivateLeadResponseAction } from "./actions";
import type { LeadResponseItem } from "./types";
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

interface LeadResponsesClientProps {
  initialResponses: LeadResponseItem[];
}

export function LeadResponsesClient({ initialResponses }: LeadResponsesClientProps) {
  const [responses, setResponses] = useState<LeadResponseItem[]>(initialResponses);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<LeadResponseItem | null>(null);

  // Deactivate State
  const [deactivatingResponse, setDeactivatingResponse] = useState<LeadResponseItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Reactivate State
  const [isReactivating, setIsReactivating] = useState(false);

  const toast = useToast();

  // Filter responses by search query
  const filteredResponses = useMemo(() => {
    if (!searchQuery.trim()) return responses;
    const q = searchQuery.toLowerCase().trim();
    return responses.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        r.createdByName.toLowerCase().includes(q)
    );
  }, [responses, searchQuery]);

  const handleOpenAdd = () => {
    setEditingResponse(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: LeadResponseItem) => {
    setEditingResponse(item);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = (saved: LeadResponseItem) => {
    setResponses((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    toast.success("Saved successfully", `Lead Response "${saved.name}" saved successfully.`);
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivatingResponse) return;
    setIsDeactivating(true);
    try {
      const res = await deleteLeadResponseAction(deactivatingResponse.id);
      if (res.success) {
        setResponses((prev) =>
          prev.map((r) => (r.id === deactivatingResponse.id ? { ...r, isActive: false } : r))
        );
        toast.success("Deactivated", `Lead Response "${deactivatingResponse.name}" deactivated.`);
        setDeactivatingResponse(null);
      } else {
        toast.error("Deactivation failed", res.error || "Failed to deactivate lead response.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Error", message);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async (item: LeadResponseItem) => {
    setIsReactivating(true);
    try {
      const res = await reactivateLeadResponseAction(item.id);
      if (res.success) {
        setResponses((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, isActive: true } : r))
        );
        toast.success("Reactivated", `Lead Response "${item.name}" reactivated successfully.`);
      } else {
        toast.error("Reactivation failed", res.error || "Failed to reactivate lead response.");
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
        title="LEAD RESPONSE"
        description="Configure conversational disposition tags and call outcome statuses."
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
            placeholder="Search lead responses..."
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
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground w-16">
                  Sort
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground">
                  Name
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-muted-foreground">
                  Lead Limit
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
              {filteredResponses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <EmptyState
                      icon="MessageSquare"
                      title="No lead responses found"
                      description={
                        responses.length === 0
                          ? 'Master list is currently empty. Click "Add" above to create your first response.'
                          : "No responses match your search query."
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredResponses.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`transition-colors group ${
                      !item.isActive
                        ? "opacity-60 bg-muted/20"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground text-center">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground">
                      —
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {!item.isActive && (
                          <Badge tone="warn">
                            Deactivated
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground">
                      —
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground max-w-xs truncate">
                      {item.description || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground">
                      {item.createdByName}
                    </td>
                    <td className="py-3.5 px-4 text-right pr-6">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1.5 h-auto text-emerald-600 dark:text-emerald-400"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Lead Response"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        {item.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 h-auto text-rose-600 dark:text-rose-400"
                            onClick={() => setDeactivatingResponse(item)}
                            title="Deactivate Lead Response"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 h-auto text-brand"
                            onClick={() => handleReactivate(item)}
                            loading={isReactivating}
                            title="Reactivate Lead Response"
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
        <LeadResponseModal
          responseItem={editingResponse}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSaveSuccess}
        />
      )}

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deactivatingResponse)}
        onClose={() => setDeactivatingResponse(null)}
        onConfirm={handleDeactivateConfirm}
        title="Deactivate Response"
        description={
          deactivatingResponse ? (
            <span>
              Deactivating <strong className="text-foreground">{deactivatingResponse.name}</strong> will hide it from new lead entry dropdowns and updates. Existing historical leads will remain intact.
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

