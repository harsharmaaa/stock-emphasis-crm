"use client";

import { useState } from "react";
import {
  type LifecycleSearchLead,
  type AllotmentUserOption,
} from "./actions";
import {
  LIFECYCLE_TABS,
  mapStatusToLifecycleKey,
} from "@/src/lib/utils";
import { LeadEditTimeline } from "./lead-edit-timeline";
import { Pencil, Inbox, Clock, X, User } from "lucide-react";

interface AdminSearchClientProps {
  initialQuery: string;
  initialLeads: LifecycleSearchLead[];
  initialStatusCounts: Record<string, number>;
  initialActiveStatusKey: string;
  allotmentUsers: AllotmentUserOption[];
  initialSelectedLeadId?: string;
}

export function AdminSearchClient({
  initialQuery,
  initialLeads,
  initialActiveStatusKey,
  allotmentUsers,
  initialSelectedLeadId,
}: AdminSearchClientProps) {
  const [leads, setLeads] = useState<LifecycleSearchLead[]>(initialLeads);
  const [activeTabKey, setActiveTabKey] = useState<string>(initialActiveStatusKey || "READ");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(
    initialSelectedLeadId || null
  );
  // State for Timeline popup modal (shows ONLY Created By and Created At timestamps)
  const [timelineModalLead, setTimelineModalLead] = useState<LifecycleSearchLead | null>(null);

  // Sync state when initial props change during render without cascading effect
  const [prevInitialLeads, setPrevInitialLeads] = useState(initialLeads);
  if (initialLeads !== prevInitialLeads) {
    setPrevInitialLeads(initialLeads);
    setLeads(initialLeads);
    setActiveTabKey(initialActiveStatusKey || "READ");
    if (initialSelectedLeadId) {
      setSelectedLeadId(initialSelectedLeadId);
    }
  }

  // Recalculate dynamic counts
  const statusCounts: Record<string, number> = {
    UNREAD: 0,
    READ: 0,
    FOLLOW_UP: 0,
    TRIAL: 0,
    CLIENT: 0,
    DISPOSED: 0,
    DELETED: 0,
    AVAILABLE: 0,
  };

  leads.forEach((l) => {
    const key = mapStatusToLifecycleKey(l.status);
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  });

  // Filter leads for the currently active tab
  const activeLeads = leads.filter((l) => mapStatusToLifecycleKey(l.status) === activeTabKey);

  // Currently selected lead for edit/timeline view
  const selectedLeadIndex = leads.findIndex((l) => l.id === selectedLeadId);
  const selectedLead = selectedLeadIndex >= 0 ? leads[selectedLeadIndex] : null;

  const handleNextLead = () => {
    if (selectedLeadIndex >= 0 && selectedLeadIndex < leads.length - 1) {
      const next = leads[selectedLeadIndex + 1];
      setSelectedLeadId(next.id);
      setActiveTabKey(mapStatusToLifecycleKey(next.status));
    }
  };

  const handlePrevLead = () => {
    if (selectedLeadIndex > 0) {
      const prev = leads[selectedLeadIndex - 1];
      setSelectedLeadId(prev.id);
      setActiveTabKey(mapStatusToLifecycleKey(prev.status));
    }
  };

  const handleLeadUpdated = (updatedLead: LifecycleSearchLead) => {
    const targetStatusKey = mapStatusToLifecycleKey(updatedLead.status);
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
    // Move UI state to the updated lifecycle status tab so it reflects immediately
    setActiveTabKey(targetStatusKey);
  };

  // If a lead is selected, render the detailed Edit Form & Timeline (Image 3)
  if (selectedLead) {
    return (
      <LeadEditTimeline
        lead={selectedLead}
        allotmentUsers={allotmentUsers}
        onGoBack={() => setSelectedLeadId(null)}
        onLeadUpdated={handleLeadUpdated}
        onNextLead={handleNextLead}
        onPrevLead={handlePrevLead}
        hasNextLead={selectedLeadIndex < leads.length - 1}
        hasPrevLead={selectedLeadIndex > 0}
      />
    );
  }

  // Otherwise, render the Search & Status Header Mapping Page (Image 2)
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title (Image 2) */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
          SEARCH
        </h1>
        {initialQuery && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Showing mapped status headers for search:{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              &quot;{initialQuery}&quot;
            </span>{" "}
            ({leads.length} {leads.length === 1 ? "match" : "matches"})
          </p>
        )}
      </div>

      {/* Status Headers Navigation Bar (Image 2) */}
      <div className="border-b border-slate-200/80 dark:border-white/[0.08] flex items-center gap-1 overflow-x-auto scrollbar-none pb-0">
        {LIFECYCLE_TABS.map((tab) => {
          const isActive = activeTabKey === tab.key;
          const count = statusCounts[tab.key] || 0;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTabKey(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all shrink-0 border-t border-x ${
                isActive
                  ? "bg-white dark:bg-[#0c1220] text-slate-900 dark:text-white border-slate-200/80 dark:border-white/[0.12] -mb-px shadow-xs z-10"
                  : "bg-slate-100/60 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  count > 0
                    ? "bg-[#38bdf8] text-white"
                    : "bg-slate-200/80 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results Table Under Active Status Header (Image 2) */}
      <div className="rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm overflow-hidden">
        {activeLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.08] text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5">
                    S.No.
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Owner
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Mobile
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Response
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Source
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Create Date
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Update Date
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                {activeLeads.map((lead, idx) => {
                  const createDate = lead.createdAt ? lead.createdAt.slice(0, 10) : "-";
                  const updateDate =
                    lead.updatedAt && lead.updatedAt !== lead.createdAt
                      ? lead.updatedAt.slice(0, 10)
                      : "-";

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                        {idx + 1}--[{lead.id.slice(-7)}]
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {lead.ownerName || "Admin"}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {lead.name}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                        {lead.mobile}
                      </td>

                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {lead.leadResponse || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {lead.leadSource || "Premium Lead"}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-blue-100/60 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {createDate}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                        {updateDate}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Dedicated Edit Button - ONLY way to open edit form */}
                          <button
                            type="button"
                            onClick={() => setSelectedLeadId(lead.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs transition-colors"
                            title="Edit lead details"
                          >
                            <Pencil className="size-3" />
                            <span>Edit</span>
                          </button>

                          {/* Timeline Button - ONLY shows Created By and Created At timestamps */}
                          <button
                            type="button"
                            onClick={() => setTimelineModalLead(lead)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-medium text-xs shadow-2xs transition-colors"
                            title="View lead creation timeline"
                          >
                            <Clock className="size-3" />
                            <span>Timeline</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 px-4 text-center space-y-2">
            <Inbox className="size-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No leads found under this status header
            </p>
            <p className="text-[11px] text-slate-400">
              Try clicking another status tab or search with a different name or phone number.
            </p>
          </div>
        )}
      </div>

      {/* Lead Timeline Modal (Shows ONLY Created By and Created At timestamps) */}
      {timelineModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setTimelineModalLead(null)}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.12] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-400">
                  <Clock className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Lead Timeline
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {timelineModalLead.name} ({timelineModalLead.mobile})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTimelineModalLead(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close timeline modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body - ONLY Created By and Created At timestamps */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-white/[0.06] space-y-3">
                {/* Created By */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <User className="size-3.5 text-slate-400" />
                    <span className="font-medium">Created By:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {timelineModalLead.createdByName || timelineModalLead.ownerName || "Admin"}
                    </span>
                    <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {timelineModalLead.createdByRole || timelineModalLead.ownerRole || "ADMIN"}
                    </span>
                  </div>
                </div>

                {/* Created At Timestamp */}
                <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Clock className="size-3.5 text-slate-400" />
                    <span className="font-medium">Created At:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
                      {new Date(timelineModalLead.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                </div>

                {/* Last Updated Timestamp */}
                {timelineModalLead.updatedAt && timelineModalLead.updatedAt !== timelineModalLead.createdAt && (
                  <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.04]">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="size-3.5 text-slate-400" />
                      <span>Last Updated:</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                        {new Date(timelineModalLead.updatedAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex justify-end">
              <button
                type="button"
                onClick={() => setTimelineModalLead(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer (Image 2) */}
      <footer className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">
        © Stock Emphasis v1.2.0. All rights reserved.
      </footer>
    </div>
  );
}
