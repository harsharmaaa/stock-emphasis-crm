"use client";

import { useState, useTransition, useId, useMemo } from "react";
import Link from "next/link";
import { Upload, FileSpreadsheet, Database } from "lucide-react";
import {
  type AllotmentUserOption,
  uploadLeadsBatchAction,
  type CsvLeadRow,
  type UploadLeadsResult,
  type SourceCountsBreakdown,
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

interface UploadLeadsClientProps {
  allotmentUsers: AllotmentUserOption[];
  initialCounts: SourceCountsBreakdown;
  activeSources?: string[];
}

interface ColumnMapping {
  mobile: number;
  name: number;
  email: number;
  city: number;
  address: number;
  segment: number;
  occupation: number;
  investment: number;
  profile: number;
}

/**
 * Robust CSV Line Parser supporting quotes, double quotes, and internal commas.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function UploadLeadsClient({
  allotmentUsers,
  initialCounts,
  activeSources = [],
}: UploadLeadsClientProps) {
  const leadSourceId = useId();
  const employeeId = useId();
  const fileInputId = useId();

  const [leadSource, setLeadSource] = useState<string>("");
  const [allotToId, setAllotToId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  // Zero-based column mapping state (blank by default, user fills manually)
  const [mapping, setMapping] = useState<ColumnMapping>({
    mobile: -1,
    name: -1,
    email: -1,
    city: -1,
    address: -1,
    segment: -1,
    occupation: -1,
    investment: -1,
    profile: -1,
  });

  const [counts, setCounts] = useState<SourceCountsBreakdown>(initialCounts);
  const displaySources = useMemo(
    () =>
      Array.from(
        new Set([...activeSources, ...Object.keys(counts.total)])
      ).sort(),
    [activeSources, counts.total]
  );
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UploadLeadsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMappingChange = (field: keyof ColumnMapping, valStr: string) => {
    const val = parseInt(valStr, 10);
    setMapping((prev) => ({
      ...prev,
      [field]: isNaN(val) ? -1 : val,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setResult(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".csv")) {
        setErrorMsg("Please choose a valid .csv file.");
        setFile(null);
        return;
      }
      setFile(selected);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);

    if (!leadSource) {
      setErrorMsg("Please select an active Lead Source from the system.");
      return;
    }

    if (!file) {
      setErrorMsg("Please select a CSV file to upload.");
      return;
    }

    if (mapping.mobile < 0) {
      setErrorMsg("Mobile column must have a valid zero-based index (0, 1, 2...).");
      return;
    }

    startTransition(async () => {
      try {
        const text = await file.text();
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length === 0) {
          setErrorMsg("The selected CSV file is empty.");
          return;
        }

        // Detect if first row looks like a header (e.g. contains 'mobile' or 'phone')
        const firstLineCells = parseCsvLine(lines[0]);
        let startIndex = 0;
        const candidateFirstCell = firstLineCells[mapping.mobile] || "";
        if (
          candidateFirstCell.toLowerCase().includes("mobile") ||
          candidateFirstCell.toLowerCase().includes("phone") ||
          isNaN(Number(candidateFirstCell.replace(/\D/g, "")))
        ) {
          // Skip header row
          startIndex = 1;
        }

        const parsedRows: CsvLeadRow[] = [];

        for (let i = startIndex; i < lines.length; i++) {
          const cells = parseCsvLine(lines[i]);
          if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue;

          const getValue = (idx: number) =>
            idx >= 0 && idx < cells.length ? cells[idx] : "";

          parsedRows.push({
            mobile: getValue(mapping.mobile),
            name: getValue(mapping.name),
            email: getValue(mapping.email) || undefined,
            city: getValue(mapping.city) || undefined,
            address: getValue(mapping.address) || undefined,
            segment: getValue(mapping.segment) || undefined,
            occupation: getValue(mapping.occupation) || undefined,
            investment: getValue(mapping.investment) || undefined,
            profile: getValue(mapping.profile) || undefined,
          });
        }

        if (parsedRows.length === 0) {
          setErrorMsg("No valid lead data rows found in the CSV file.");
          return;
        }

        const res = await uploadLeadsBatchAction({
          leadSource,
          allotToId: allotToId || undefined,
          leads: parsedRows,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to process lead upload.");
        } else {
          setResult(res);
          // Increment counts locally for instant UI responsiveness
          setCounts((prev) => ({
            total: {
              ...prev.total,
              [leadSource]: (prev.total[leadSource] || 0) + res.importedCount,
            },
            unassigned: {
              ...prev.unassigned,
              // If allotted to employee during upload, unassigned count stays same; otherwise increments
              [leadSource]:
                (prev.unassigned[leadSource] || 0) +
                (allotToId ? 0 : res.importedCount),
            },
          }));
          // Reset file input
          setFile(null);
          const fileInput = document.getElementById(
            fileInputId
          ) as HTMLInputElement | null;
          if (fileInput) fileInput.value = "";
        }
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while parsing the file."
        );
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Leads", href: "/admin/leads" },
          { label: "Upload Leads" },
        ]}
        title={
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-[var(--brand-tint)] flex items-center justify-center text-[var(--brand)]">
              <Upload className="size-5" />
            </div>
            <span>Upload Leads</span>
          </div>
        }
        description="Bulk register client inquiries into the database from CSV with automated duplicate prevention."
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
          <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--subtle)]">
            <h2 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-[var(--brand)]" />
              <span>CSV File Upload &amp; Column Configuration</span>
            </h2>
          </div>

          <form onSubmit={handleUpload} className="p-5 sm:p-6 space-y-5">
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
                    <span>Import Completed Successfully</span>
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block font-medium">
                      Imported
                    </span>
                    <span className="text-base font-bold text-[var(--ok)]">
                      {result.importedCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block font-medium">
                      Skipped (Duplicate)
                    </span>
                    <span className="text-base font-bold text-[var(--warn)]">
                      {result.skippedDuplicates.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block font-medium">
                      Invalid Rows
                    </span>
                    <span className="text-base font-bold text-[var(--err)]">
                      {result.invalidRows.length}
                    </span>
                  </div>
                </div>

                {/* Granular skipped duplicates list */}
                {result.skippedDuplicates.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-[var(--warn)] flex items-center gap-1.5 mb-1.5">
                      <Icon
                        name="TriangleAlert"
                        size={12}
                        className="text-[var(--warn)]"
                      />
                      <span>
                        Skipped Duplicates ({result.skippedDuplicates.length}):
                      </span>
                    </span>
                    <div className="max-h-24 overflow-y-auto text-[10px] font-mono text-[var(--muted)] bg-[var(--surface)] p-2 rounded-lg border border-[var(--border)] space-y-0.5">
                      {result.skippedDuplicates.map((dup, idx) => (
                        <div key={idx}>• Skipped (Duplicate): {dup}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Granular invalid rows list */}
                {result.invalidRows.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-[var(--err)] flex items-center gap-1.5 mb-1.5">
                      <Icon
                        name="TriangleAlert"
                        size={12}
                        className="text-[var(--err)]"
                      />
                      <span>
                        Invalid Rows ({result.invalidRows.length}):
                      </span>
                    </span>
                    <div className="max-h-24 overflow-y-auto text-[10px] font-mono text-[var(--muted)] bg-[var(--surface)] p-2 rounded-lg border border-[var(--border)] space-y-0.5">
                      {result.invalidRows.map((r, idx) => (
                        <div key={idx}>
                          • Row {r.rowNumber}: {r.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lead Source & Employee Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Lead Source" id={leadSourceId} required>
                <Select
                  id={leadSourceId}
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                >
                  {activeSources.length === 0 ? (
                    <option value="">No sources configured in Settings</option>
                  ) : (
                    <>
                      <option value="">-- Select Source --</option>
                      {activeSources.map((src: string) => (
                        <option key={src} value={src}>
                          {src}
                        </option>
                      ))}
                    </>
                  )}
                </Select>
              </Field>

              <Field label="Assign to Employee (Optional)" id={employeeId}>
                <Select
                  id={employeeId}
                  value={allotToId}
                  onChange={(e) => setAllotToId(e.target.value)}
                >
                  <option value="">Select Employee (Leave Unallotted)</option>
                  {allotmentUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) {u.teamName ? `— ${u.teamName}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* CSV File Input */}
            <Field label="CSV File" id={fileInputId} required>
              <input
                id={fileInputId}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="block w-full text-xs text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[var(--brand-tint)] file:text-[var(--brand)] hover:file:opacity-90 file:cursor-pointer cursor-pointer border border-[var(--border)] rounded-xl bg-[var(--surface)] p-1 transition-colors"
              />
            </Field>

            {/* Column Mapping Section */}
            <div className="pt-2 border-t border-[var(--border)]">
              <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-[var(--brand)]">
                <Icon name="Info" size={14} />
                <span>* Note :- Column Count start with 0.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { key: "mobile" as const, label: "Mobile Column", required: true },
                  { key: "name" as const, label: "Name Column", required: false },
                  { key: "email" as const, label: "Email Column", required: false },
                  { key: "city" as const, label: "City Column", required: false },
                  { key: "address" as const, label: "Address Column", required: false },
                  { key: "segment" as const, label: "Segment Column", required: false },
                  { key: "occupation" as const, label: "Occupation Column", required: false },
                  { key: "investment" as const, label: "Investment Column", required: false },
                  { key: "profile" as const, label: "Profile Column", required: false },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <label className="text-xs text-[var(--text)] font-medium">
                      {item.label}{" "}
                      {item.required && (
                        <span className="text-[var(--err)]">*</span>
                      )}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={mapping[item.key] >= 0 ? mapping[item.key] : ""}
                      onChange={(e) =>
                        handleMappingChange(item.key, e.target.value)
                      }
                      placeholder=""
                      className="w-24 text-center font-mono py-1 h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-[var(--border)]">
              <Button
                type="submit"
                variant="primary"
                disabled={isPending || !file}
                loading={isPending}
                loadingText="Processing CSV Import..."
              >
                <Upload className="size-4" />
                <span>Upload</span>
              </Button>
            </div>
          </form>
        </Card>

        {/* Right Sidebar: Leads Count Breakdown (Total vs Unassigned) */}
        <Card className="lg:col-span-4 p-0 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--subtle)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <Database className="size-4 text-[var(--brand)]" />
                <span>Leads Breakdown</span>
              </h3>
              <Badge tone="info" className="font-mono text-[10px]">
                {displaySources.length} Sources
              </Badge>
            </div>
            {/* Header Column Labels */}
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted)] px-1 pt-1 border-t border-[var(--border)]">
              <span>Source</span>
              <div className="flex items-center gap-4 text-right">
                <span className="w-14">Total</span>
                <span className="w-16 text-[var(--ok)]">Available</span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-2.5 divide-y divide-[var(--border)]">
            {displaySources.map((src: string) => {
              const totalCount = counts.total[src] || 0;
              const unassignedCount = counts.unassigned[src] || 0;
              return (
                <div
                  key={src}
                  className="pt-2.5 first:pt-0 flex items-center justify-between text-xs"
                >
                  <span className="text-[var(--text)] font-medium truncate max-w-[130px]">
                    {src}
                  </span>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <span className="w-14 font-mono font-bold text-[var(--text)]">
                      {totalCount.toLocaleString()}
                    </span>
                    <span
                      className={`w-16 font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
                        unassignedCount > 0
                          ? "bg-[var(--ok-tint)] text-[var(--ok)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {unassignedCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
