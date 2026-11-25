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
import { AdminLeadTimelineModal } from "./admin-lead-timeline-modal";
import { Pencil, Clock } from "lucide-react";
import { PageHeader, Card, Badge, Button, EmptyState } from "@/src/components/ui";

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
      {/* Title */}
      <PageHeader
        title="SEARCH"
        description={
          initialQuery
            ? `Showing mapped status headers for search: "${initialQuery}" (${leads.length} ${
                leads.length === 1 ? "match" : "matches"
              })`
            : undefined
        }
      />

      {/* Status Headers Navigation Bar */}
      <div className="border-b border-border/80 flex items-center gap-1 overflow-x-auto scrollbar-none pb-0">
        {LIFECYCLE_TABS.map((tab) => {
          const isActive = activeTabKey === tab.key;
          const count = statusCounts[tab.key] || 0;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTabKey(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all shrink-0 border-t border-x cursor-pointer ${
                isActive
                  ? "bg-card text-foreground border-border -mb-px shadow-xs z-10"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>{tab.label}</span>
              <Badge
                tone={count > 0 ? "info" : undefined}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Results Table Under Active Status Header */}
      <Card className="overflow-hidden">
        {activeLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/20 border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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

              <tbody className="divide-y divide-border/40">
                {activeLeads.map((lead, idx) => {
                  const createDate = lead.createdAt ? lead.createdAt.slice(0, 10) : "-";
                  const updateDate =
                    lead.updatedAt && lead.updatedAt !== lead.createdAt
                      ? lead.updatedAt.slice(0, 10)
                      : "-";

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {idx + 1}--[{lead.id.slice(-7)}]
                      </td>

                      <td className="px-4 py-3 font-medium text-foreground">
                        {lead.ownerName || "Admin"}
                      </td>

                      <td className="px-4 py-3 font-semibold text-foreground">
                        {lead.name}
                      </td>

                      <td className="px-4 py-3 font-mono text-foreground">
                        {lead.mobile}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.leadResponse || "-"}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.leadSource || "—"}
                      </td>

                      <td className="px-4 py-3 font-mono">
                        <Badge tone="info">
                          {createDate}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {updateDate}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Dedicated Edit Button */}
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon="Pencil"
                            onClick={() => setSelectedLeadId(lead.id)}
                            title="Edit lead details"
                          >
                            Edit
                          </Button>

                          {/* Timeline Button */}
                          <Button
                            variant="sec"
                            size="sm"
                            leftIcon="Clock"
                            onClick={() => setTimelineModalLead(lead)}
                            title="View lead creation timeline"
                          >
                            Timeline
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8">
            <EmptyState
              icon="Inbox"
              title="No leads found under this status header"
              description="Try clicking another status tab or search with a different name or phone number."
            />
          </div>
        )}
      </Card>

      {/* Lead Timeline Modal */}
      <AdminLeadTimelineModal
        lead={timelineModalLead}
        isOpen={!!timelineModalLead}
        onClose={() => setTimelineModalLead(null)}
      />

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground">
        © Stock Emphasis v1.2.0. All rights reserved.
      </footer>
    </div>
  );
}
