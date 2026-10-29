"use client";

import { useState, useTransition, useId } from "react";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Database,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  type AllotmentUserOption,
  uploadLeadsBatchAction,
  type CsvLeadRow,
  type UploadLeadsResult,
  type SourceCountsBreakdown,
} from "./actions";
import { LEAD_SOURCE_OPTIONS } from "@/src/lib/utils";

interface UploadLeadsClientProps {
  allotmentUsers: AllotmentUserOption[];
  initialCounts: SourceCountsBreakdown;
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
}: UploadLeadsClientProps) {
  const leadSourceId = useId();
  const employeeId = useId();
  const fileInputId = useId();

  const [leadSource, setLeadSource] = useState<string>("Premium Lead");
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

          const getValue = (idx: number) => (idx >= 0 && idx < cells.length ? cells[idx] : "");

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
          const fileInput = document.getElementById(fileInputId) as HTMLInputElement | null;
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
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/leads"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              Back to Leads
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Upload className="size-5" />
            </div>
            Upload Leads
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bulk register client inquiries into the database from CSV with automated duplicate prevention.
          </p>
        </div>

        <Link
          href="/admin/leads"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-all"
        >
          Go Back
        </Link>
      </div>

      {/* Main Grid: Form (Col-span 8) + Leads Count Sidebar (Col-span 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Box */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs overflow-hidden backdrop-blur-xl">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02]">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-blue-500" />
              CSV File Upload & Column Configuration
            </h2>
          </div>

          <form onSubmit={handleUpload} className="p-5 sm:p-6 space-y-5">
            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
                <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs font-medium text-rose-800 dark:text-rose-300">
                  {errorMsg}
                </div>
              </div>
            )}

            {/* Success / Result Feedback */}
            {result && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Import Completed Successfully
                  </div>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    title="Dismiss message"
                    className="p-1 rounded-md text-emerald-700 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Imported</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {result.importedCount}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Skipped (Duplicate)</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {result.skippedDuplicates.length}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Invalid Rows</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {result.invalidRows.length}
                    </span>
                  </div>
                </div>

                {/* Granular skipped duplicates list */}
                {result.skippedDuplicates.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-1">
                      <AlertTriangle className="size-3 text-amber-600" />
                      Skipped Duplicates ({result.skippedDuplicates.length}):
                    </span>
                    <div className="max-h-24 overflow-y-auto text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200 dark:border-white/[0.08] space-y-0.5">
                      {result.skippedDuplicates.map((dup, idx) => (
                        <div key={idx}>• Skipped (Duplicate): {dup}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lead Source & Employee Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={leadSourceId}
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Lead Source <span className="text-rose-500">*</span>
                </label>
                <select
                  id={leadSourceId}
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {LEAD_SOURCE_OPTIONS.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={employeeId}
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Assign to Employee (Optional)
                </label>
                <select
                  id={employeeId}
                  value={allotToId}
                  onChange={(e) => setAllotToId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select Employee (Leave Unallotted)</option>
                  {allotmentUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) {u.teamName ? `— ${u.teamName}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CSV File Input */}
            <div>
              <label
                htmlFor={fileInputId}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                CSV File <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={fileInputId}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/50 dark:file:text-blue-300 file:cursor-pointer cursor-pointer border border-slate-250 dark:border-white/[0.1] rounded-xl bg-white dark:bg-slate-900 p-1"
                />
              </div>
            </div>

            {/* Column Mapping Section */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
              <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <Info className="size-3.5" />
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
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {item.label}{" "}
                      {item.required && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={mapping[item.key] >= 0 ? mapping[item.key] : ""}
                      onChange={(e) => handleMappingChange(item.key, e.target.value)}
                      placeholder=""
                      className="w-24 px-2.5 py-1 text-xs text-center font-mono rounded-lg border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.08]">
              <button
                type="submit"
                disabled={isPending || !file}
                className="w-full sm:w-auto px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing CSV Import...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Leads Count Breakdown (Total vs Unassigned) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs overflow-hidden backdrop-blur-xl">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Database className="size-4 text-violet-500" />
                Leads Breakdown
              </h3>
              <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md">
                {LEAD_SOURCE_OPTIONS.length} Sources
              </span>
            </div>
            {/* Header Column Labels */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 px-1 pt-1 border-t border-slate-200/60 dark:border-white/[0.05]">
              <span>Source</span>
              <div className="flex items-center gap-4 text-right">
                <span className="w-14">Total</span>
                <span className="w-16 text-emerald-600 dark:text-emerald-400">Available</span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-2.5 divide-y divide-slate-100 dark:divide-white/[0.04]">
            {LEAD_SOURCE_OPTIONS.map((src) => {
              const totalCount = counts.total[src] || 0;
              const unassignedCount = counts.unassigned[src] || 0;
              return (
                <div
                  key={src}
                  className="pt-2.5 first:pt-0 flex items-center justify-between text-xs"
                >
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[130px]">
                    {src}
                  </span>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <span className="w-14 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {totalCount.toLocaleString()}
                    </span>
                    <span
                      className={`w-16 font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
                        unassignedCount > 0
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400"
                      }`}
                    >
                      {unassignedCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
