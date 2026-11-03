"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Search,
  Edit2,
  Trash2,
  MessageSquare,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { LeadResponseModal } from "./lead-response-modal";
import { deleteLeadResponseAction, reactivateLeadResponseAction } from "./actions";
import type { LeadResponseItem } from "./types";

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

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

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
    showToast("success", `Lead Response "${saved.name}" saved successfully.`);
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
        showToast("success", `Lead Response "${deactivatingResponse.name}" deactivated.`);
        setDeactivatingResponse(null);
      } else {
        showToast("error", res.error || "Failed to deactivate lead response.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      showToast("error", message);
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
        showToast("success", `Lead Response "${item.name}" reactivated successfully.`);
      } else {
        showToast("error", res.error || "Failed to reactivate lead response.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      showToast("error", message);
    } finally {
      setIsReactivating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-18 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            toastMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">
            LEAD RESPONSE
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure conversational disposition tags and call outcome statuses.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Add Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add</span>
          </button>

          {/* Go Back to Configuration */}
          <Link
            href="/admin/settings/configuration"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Go Back</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lead responses..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Table Container matching legacy screenshot columns: #, Sort, Name, Lead Limit, Added By, Action */}
      <div className="bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 w-12 text-center">
                  #
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 w-16">
                  Sort
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  Name
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  Lead Limit
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  Description
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  Added By
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 text-right pr-6">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {filteredResponses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <MessageSquare className="size-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">No lead responses found.</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {responses.length === 0
                        ? 'Master list is currently empty. Click "Add" above to create your first response.'
                        : "No responses match your search query."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredResponses.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`transition-colors group ${
                      !item.isActive
                        ? "opacity-60 bg-slate-50/40 dark:bg-slate-900/40"
                        : "hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-400">
                      —
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {!item.isActive && (
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                            Deactivated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-400">
                      —
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {item.description || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {item.createdByName}
                    </td>
                    <td className="py-3.5 px-4 text-right pr-6">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-md border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          title="Edit Lead Response"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        {item.isActive ? (
                          <button
                            type="button"
                            onClick={() => setDeactivatingResponse(item)}
                            className="p-1.5 rounded-md border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Deactivate Lead Response"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReactivate(item)}
                            disabled={isReactivating}
                            className="p-1.5 rounded-md border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title="Reactivate Lead Response"
                          >
                            <RotateCcw className="size-3.5" />
                          </button>
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
        <div className="p-4 border-t border-slate-200/70 dark:border-white/[0.06] text-center text-[11px] text-slate-400 dark:text-slate-500">
          © Stock Emphasis v4.2.0. All rights reserved.
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <LeadResponseModal
          responseItem={editingResponse}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSaveSuccess}
        />
      )}

      {/* Deactivate Confirmation Modal */}
      {deactivatingResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0c1220] p-6 shadow-2xl border border-slate-200 dark:border-white/[0.1] space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-10 rounded-full bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Deactivate Response</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hide from new dropdowns</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Deactivating <span className="font-semibold text-slate-900 dark:text-white">{deactivatingResponse.name}</span> will hide it from new lead entry dropdowns and updates. Existing historical leads will remain intact.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeactivatingResponse(null)}
                disabled={isDeactivating}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateConfirm}
                disabled={isDeactivating}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5"
              >
                {isDeactivating ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

