"use client";

import { useState, useTransition, useId, useMemo } from "react";
import Link from "next/link";
import { Share2, UserCheck, Hash, Database } from "lucide-react";
import {
  type AllotmentUserOption,
  allotLeadsAction,
  getLeadSourceCountsAction,
  type AllotLeadsResult,
} from "./actions";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Field,
  Select,
  Input,
  Icon,
} from "@/src/components/ui";

export interface EmployeeProfileOption {
  id: string;
  name: string;
}

interface AllotLeadsClientProps {
  allotmentUsers: AllotmentUserOption[];
  initialSourceCounts: Record<string, number>;
  employeeProfiles?: EmployeeProfileOption[];
  activeSources?: string[];
}

export function AllotLeadsClient({
  allotmentUsers,
  initialSourceCounts,
  employeeProfiles = [],
  activeSources = [],
}: AllotLeadsClientProps) {
  const leadSourceId = useId();
  const profileId = useId();
  const employeeId = useId();
  const leadCountId = useId();

  const [leadSource, setLeadSource] = useState<string>("");
  const [profile, setProfile] = useState<string>(""); // "" = All Profiles
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("");
  const [numberOfLeads, setNumberOfLeads] = useState<string>("");

  const [sourceCounts, setSourceCounts] =
    useState<Record<string, number>>(initialSourceCounts);
  const displaySources = useMemo(
    () =>
      Array.from(
        new Set([...activeSources, ...Object.keys(sourceCounts)])
      ).sort(),
    [activeSources, sourceCounts]
  );
  const [isPending, startTransition] = useTransition();
  const [isCountsLoading, setIsCountsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AllotLeadsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableCount = sourceCounts[leadSource] || 0;

  // Refresh counts when profile changes
  const handleProfileChange = async (selectedProfile: string) => {
    setProfile(selectedProfile);
    setErrorMsg(null);
    setIsCountsLoading(true);

    try {
      const res = await getLeadSourceCountsAction({
        unassignedOnly: true,
        profile: selectedProfile || undefined,
      });
      if (res.success && res.counts) {
        setSourceCounts(res.counts);
      }
    } catch {
      // Ignore network fetch errors gracefully
    } finally {
      setIsCountsLoading(false);
    }
  };

  const handleAllot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);

    if (!leadSource) {
      setErrorMsg("Please select a Lead Source to allot.");
      return;
    }

    const countNum = parseInt(numberOfLeads, 10);
    if (isNaN(countNum) || countNum <= 0) {
      setErrorMsg("Please enter a valid positive number of leads to allot.");
      return;
    }

    if (!targetEmployeeId) {
      setErrorMsg("Please select an employee to receive the leads.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await allotLeadsAction({
          leadSource,
          profile: profile || undefined,
          employeeId: targetEmployeeId,
          numberOfLeads: countNum,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to allot leads.");
        } else {
          setResult(res);
          // Decrement available unassigned count locally
          setSourceCounts((prev) => ({
            ...prev,
            [leadSource]: Math.max(
              0,
              (prev[leadSource] || 0) - res.allottedCount
            ),
          }));
          // Reset count input
          setNumberOfLeads("");
        }
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during lead allotment."
        );
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Leads", href: "/admin/leads" },
          { label: "Allot Leads" },
        ]}
        title={
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-[var(--brand-tint)] flex items-center justify-center text-[var(--brand)]">
              <Share2 className="size-5" />
            </div>
            <span>Allot Leads</span>
          </div>
        }
        description="Distribute unassigned prospect leads to sales and advisory personnel in oldest-first order."
        actions={
          <Link href="/admin/leads">
            <Button variant="outline" size="sm" leftIcon="ChevronLeft">
              Go Back
            </Button>
          </Link>
        }
      />

      {/* Main Grid: Form (Col-span 8) + Leads Count Sidebar (Col-span 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Box */}
        <Card className="lg:col-span-8 p-0 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--subtle)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <UserCheck className="size-4 text-[var(--brand)]" />
              <span>Lead Allocation Details</span>
            </h2>
            <span className="text-[11px] font-medium text-[var(--muted)]">
              Available in &quot;{leadSource}&quot;
              {profile ? ` (${profile})` : ""}:{" "}
              <span className="font-mono font-bold text-[var(--text)]">
                {availableCount.toLocaleString()}
              </span>
            </span>
          </div>

          <form onSubmit={handleAllot} className="p-5 sm:p-6 space-y-5">
            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-[var(--err-tint)] border border-[var(--err-border)] flex items-start gap-3">
                <Icon
                  name="TriangleAlert"
                  size={16}
                  className="text-[var(--err)] shrink-0 mt-0.5"
                />
                <div className="text-xs font-medium text-[var(--err)]">
                  {errorMsg}
                </div>
              </div>
            )}

            {/* Success / Result Feedback */}
            {result && (
              <div className="p-4 rounded-xl bg-[var(--ok-tint)] border border-[var(--ok-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--ok)]">
                    <Icon
                      name="CircleCheck"
                      size={16}
                      className="text-[var(--ok)]"
                    />
                    <span>Allotment Completed</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    title="Dismiss message"
                    className="p-1 rounded-md text-[var(--ok)] hover:bg-[var(--ok-tint)] transition-colors cursor-pointer"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block font-medium">
                      Assigned To
                    </span>
                    <span className="text-xs font-bold text-[var(--text)] truncate block">
                      {result.employeeName}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block font-medium">
                      Lead Source
                    </span>
                    <span className="text-xs font-bold text-[var(--text)] truncate block">
                      {result.source}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block font-medium">
                      Profile
                    </span>
                    <span className="text-xs font-bold text-[var(--text)] truncate block">
                      {result.profile || "All Profiles"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block font-medium">
                      Allotted
                    </span>
                    <span className="text-base font-bold text-[var(--ok)]">
                      {result.allottedCount}
                    </span>
                  </div>
                </div>

                {result.shortageCount > 0 && (
                  <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--warn)] bg-[var(--warn-tint)] p-3 rounded-xl border border-[var(--warn-border)]">
                    <Icon
                      name="TriangleAlert"
                      size={14}
                      className="text-[var(--warn)] shrink-0"
                    />
                    <span>
                      Notice: Requested {result.requestedCount} leads, but only{" "}
                      {result.allottedCount} unassigned leads were available in
                      &quot;{result.source}&quot;
                      {result.profile ? ` (${result.profile})` : ""}. All{" "}
                      {result.allottedCount} available leads were assigned.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 1. Lead Source */}
            <Field label="Lead Source" id={leadSourceId} required>
              <Select
                id={leadSourceId}
                value={leadSource}
                onChange={(e) => {
                  setLeadSource(e.target.value);
                  setErrorMsg(null);
                }}
              >
                <option value="">-- Select Source --</option>
                {displaySources.map((src: string) => (
                  <option key={src} value={src}>
                    {src} ({sourceCounts[src] || 0} unassigned)
                  </option>
                ))}
              </Select>
            </Field>

            {/* 2. Profile (Employee Designation) */}
            <Field
              label="Profile (Employee Designation)"
              id={profileId}
              description="Employee working designation (e.g. SBA, AFM, TL, Admin)."
            >
              <Select
                id={profileId}
                value={profile}
                onChange={(e) => {
                  handleProfileChange(e.target.value);
                }}
              >
                <option value="">All Profiles (No Filter)</option>
                {employeeProfiles.map((prof) => (
                  <option key={prof.id} value={prof.name}>
                    {prof.name}
                  </option>
                ))}
              </Select>
            </Field>

            {/* 3. Employee Selection */}
            <Field label="Employee" id={employeeId} required>
              <Select
                id={employeeId}
                value={targetEmployeeId}
                onChange={(e) => {
                  setTargetEmployeeId(e.target.value);
                  setErrorMsg(null);
                }}
              >
                <option value="">Select Employee to receive leads</option>
                {allotmentUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) {u.teamName ? `— ${u.teamName}` : ""}
                  </option>
                ))}
              </Select>
            </Field>

            {/* 4. Number of Leads */}
            <Field
              label="Number Of Leads"
              id={leadCountId}
              required
              description={`Leads are picked in oldest-first order (${availableCount} currently available in "${leadSource}"${
                profile ? ` for ${profile}` : ""
              }).`}
            >
              <div className="relative">
                <Input
                  id={leadCountId}
                  type="number"
                  min={1}
                  value={numberOfLeads}
                  onChange={(e) => {
                    setNumberOfLeads(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. 50, 100, 500"
                  className="w-full pr-9 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[var(--muted)]">
                  <Hash className="size-3.5" />
                </div>
              </div>
            </Field>

            {/* Submit Button */}
            <div className="pt-4 border-t border-[var(--border)]">
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isPending ||
                  !targetEmployeeId ||
                  !numberOfLeads ||
                  availableCount === 0
                }
                loading={isPending}
                loadingText="Allotting Leads..."
              >
                <Share2 className="size-4" />
                <span>Allot</span>
              </Button>
            </div>
          </form>
        </Card>

        {/* Right Sidebar: Leads Count Breakdown */}
        <Card className="lg:col-span-4 p-0 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--subtle)] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <Database className="size-4 text-[var(--brand)]" />
              <span>Unassigned Leads Count</span>
            </h3>
            <Badge tone="info" className="font-mono text-[10px]">
              {profile ? profile : "All Profiles"}
            </Badge>
          </div>

          <div className="p-4 sm:p-5 space-y-2 divide-y divide-[var(--border)]">
            {isCountsLoading ? (
              <div className="py-6 flex flex-col items-center justify-center text-[var(--muted)] gap-2">
                <div className="animate-spin text-[var(--brand)]">
                  <Icon name="RefreshCw" size={16} />
                </div>
                <span className="text-[11px]">
                  Updating counts for {profile}...
                </span>
              </div>
            ) : (
              displaySources.map((src: string) => {
                const count = sourceCounts[src] || 0;
                const isSelected = src === leadSource;
                return (
                  <div
                    key={src}
                    onClick={() => setLeadSource(src)}
                    className={`pt-2 first:pt-0 flex items-center justify-between text-xs cursor-pointer rounded-xl px-2.5 py-1.5 transition-colors ${
                      isSelected
                        ? "bg-[var(--brand-tint)] text-[var(--brand)] font-semibold border border-[var(--brand-border)]"
                        : "hover:bg-[var(--subtle)] text-[var(--text)]"
                    }`}
                  >
                    <span className="truncate">{src}</span>
                    <span className="font-mono font-bold text-[var(--text)] ml-2">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
