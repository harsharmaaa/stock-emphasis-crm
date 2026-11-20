"use client";

import { X, User, Phone, DollarSign, Tag } from "lucide-react";
import type { EmployeeLeadItem } from "./lead-actions";

interface EmployeeLeadDetailsModalProps {
  lead: EmployeeLeadItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeeLeadDetailsModal({
  lead,
  isOpen,
  onClose,
}: EmployeeLeadDetailsModalProps) {
  if (!isOpen || !lead) return null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.12] shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {lead.name}
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Lead #{lead.id.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Section: Contact & Identity */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] space-y-2.5">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Phone className="size-3.5 text-cyan-500" />
              <span>Contact Information</span>
            </h3>
            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/[0.04]">
              <span className="text-slate-500">Mobile:</span>
              <a href={`tel:${lead.mobile}`} className="font-mono text-cyan-600 dark:text-cyan-400 hover:underline">
                {lead.mobile}
              </a>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/[0.04]">
              <span className="text-slate-500">Alt Mobile:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{lead.alternateMobile || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/[0.04]">
              <span className="text-slate-500">Email:</span>
              <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{lead.email || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/[0.04]">
              <span className="text-slate-500">Location:</span>
              <span className="text-slate-800 dark:text-slate-200">
                {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">District:</span>
              <span className="text-slate-800 dark:text-slate-200">{lead.district || "—"}</span>
            </div>
          </div>

          {/* Section: Profile & Financials */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] space-y-2.5">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-emerald-500" />
              <span>Profile & Financials</span>
            </h3>
            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/[0.04]">
              <span className="text-slate-500">Profile:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{lead.profile || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/[0.04]">
              <span className="text-slate-500">Investment:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {lead.investment ? `₹${lead.investment}` : "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/[0.04]">
              <span className="text-slate-500">Segment:</span>
              <span className="text-slate-800 dark:text-slate-200">{lead.segment || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/[0.04]">
              <span className="text-slate-500">Occupation:</span>
              <span className="text-slate-800 dark:text-slate-200">{lead.occupation || "—"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">PAN / GST:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {[lead.pan, lead.gstin].filter(Boolean).join(" / ") || "—"}
              </span>
            </div>
          </div>

          {/* Section: Pipeline & Interaction */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] space-y-2.5 md:col-span-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="size-3.5 text-purple-500" />
              <span>CRM Lifecycle & Interaction</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400 block text-[10px]">Status</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md font-bold text-xs bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                  {lead.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Call Response</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {lead.leadResponse || "Interested"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Lead Source</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {lead.leadSource || "DIRECT"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Next Callback</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                  {lead.callbackDate ? formatDate(lead.callbackDate) : "—"}
                </span>
              </div>
            </div>

            {lead.description && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                <span className="text-slate-400 block text-[10px] mb-1">Notes / Description</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/70 dark:border-white/[0.06]">
                  {lead.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
