"use client";

import React, { useState, useEffect, useCallback, useTransition, useRef } from "react";
import {
  X,
  Filter,
  Calendar,
  IndianRupee,
  Phone,
  RotateCcw,
  Loader2,
  TableProperties,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  EmployeeLeadCountFiltersInput,
  LeadCountSummaryResult,
  DispositionBreakdownItem,
} from "@/src/features/employee/lead-actions";

export interface LeadCountFilterApplyPayload {
  selectedKeys: string[];
  selectedStages: string[];
  selectedResponses: string[];
  lastUpdateDateType?: string | null;
  lastUpdateDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  leadSource?: string | null;
  leadResponse?: string | null;
  trialStatus?: string | null;
  serviceStatus?: string | null;
  serviceId?: string | null;
  createdById?: string | null;
  leadOwnerId?: string | null;
  teamId?: string | null;
  leadAssignment?: string | null;
  leadRecycleCount?: string | null;
  paidRange?: string | null;
  mobile?: string | null;
}

export interface LeadCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "employee" | "admin";
  fetchCountsAction: (
    filters: EmployeeLeadCountFiltersInput
  ) => Promise<LeadCountSummaryResult>;
  onSelectStageOrResponse?: (selection: {
    type: "stage" | "response";
    value: string;
  }) => void;
  onApplyFilters?: (filters: LeadCountFilterApplyPayload) => void;
  onResetFilters?: () => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const PRESETS = [
  "Today",
  "Yesterday",
  "Last 7 Days",
  "Last 30 Days",
  "This Month",
  "Last Month",
  "Custom Range",
] as const;

type PresetType = (typeof PRESETS)[number];

const LAST_UPDATE_DATE_OPTIONS = [
  "Call Back date",
  "followup added date",
  "Trial added date",
  "client conversion date",
  "Lead uploaded date",
  "lead alloted date",
  "pending callback",
  "upcomming callback",
  "pending followup",
  "updated followup",
];

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

interface SearchableOption {
  value: string;
  label: string;
}

/**
 * Custom Searchable Select matching the old CRM dropdowns
 * (with search input box at the top and active item highlighted in #0284c7)
 */
function SearchableSelect({
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  options: SearchableOption[];
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel =
    selectedOption && selectedOption.value !== "" ? selectedOption.label : placeholder;

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setSearch("");
          }
        }}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none transition-colors text-left ${disabled
          ? "opacity-80 cursor-not-allowed"
          : "cursor-pointer hover:border-slate-300 dark:hover:border-white/[0.2]"
          }`}
      >
        <span className="truncate">{displayLabel}</span>
        {isOpen ? (
          <ChevronUp className="size-3.5 text-slate-400 shrink-0 ml-2" />
        ) : (
          <ChevronDown className="size-3.5 text-slate-400 shrink-0 ml-2" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-white/[0.15] shadow-xl p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
          {/* Search box matching old CRM screenshot with border */}
          <div className="p-1">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border-slate-400 dark:border-white/30 bg-slate-50/80 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto max-h-48 flex flex-col">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors cursor-pointer select-none rounded ${isSelected
                      ? "bg-[#0284c7] text-white font-medium shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-[11px] text-slate-400 text-center">
                No matching results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function LeadCountModal({
  isOpen,
  onClose,
  mode = "employee",
  fetchCountsAction,
  onSelectStageOrResponse,
  onApplyFilters,
  onResetFilters,
}: LeadCountModalProps) {
  if (!isOpen) return null;

  return (
    <LeadCountModalContent
      onClose={onClose}
      mode={mode}
      fetchCountsAction={fetchCountsAction}
      onSelectStageOrResponse={onSelectStageOrResponse}
      onApplyFilters={onApplyFilters}
      onResetFilters={onResetFilters}
    />
  );
}

function LeadCountModalContent({
  onClose,
  fetchCountsAction,
  onSelectStageOrResponse,
  onApplyFilters,
  onResetFilters,
}: {
  onClose: () => void;
  mode?: "employee" | "admin";
  fetchCountsAction: (
    filters: EmployeeLeadCountFiltersInput
  ) => Promise<LeadCountSummaryResult>;
  onSelectStageOrResponse?: (selection: {
    type: "stage" | "response";
    value: string;
  }) => void;
  onApplyFilters?: (filters: LeadCountFilterApplyPayload) => void;
  onResetFilters?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<LeadCountSummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters state (Right Column - matching Screenshot (165).jpg)
  const [lastUpdateDateType, setLastUpdateDateType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [leadResponse, setLeadResponse] = useState("");
  const [trialStatus, setTrialStatus] = useState("");
  const [serviceStatus, setServiceStatus] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [createdById, setCreatedById] = useState("");
  const [leadOwnerId, setLeadOwnerId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [leadRecycleCount, setLeadRecycleCount] = useState("");
  const [paidRange, setPaidRange] = useState("");
  const [leadAssignment, setLeadAssignment] = useState("");
  const [mobile, setMobile] = useState("");

  // Checkbox selection state (Left Column)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Date Range Popover & Dual Calendar state
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetType | "">("");
  const datePopoverRef = useRef<HTMLDivElement | null>(null);

  const now = new Date();
  const [cal1Year, setCal1Year] = useState(now.getFullYear());
  const [cal1Month, setCal1Month] = useState(now.getMonth());

  // Calendar 2 is always Month 1 + 1 month
  const cal2Month = (cal1Month + 1) % 12;
  const cal2Year = cal1Month === 11 ? cal1Year + 1 : cal1Year;

  // Temporary selection state when clicking days
  const [tempDateRange, setTempDateRange] = useState<{
    start: string | null;
    end: string | null;
  }>({ start: null, end: null });

  // Close date popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        datePopoverRef.current &&
        !datePopoverRef.current.contains(event.target as Node)
      ) {
        setIsDatePopoverOpen(false);
      }
    }
    if (isDatePopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDatePopoverOpen]);

  const loadCounts = useCallback(
    (customFilters?: Partial<EmployeeLeadCountFiltersInput>) => {
      startTransition(async () => {
        setError(null);
        try {
          const payload: EmployeeLeadCountFiltersInput = {
            lastUpdateDateType: lastUpdateDateType || null,
            startDate: startDate || null,
            endDate: endDate || null,
            leadSource: leadSource || null,
            leadResponse: leadResponse || null,
            trialStatus: trialStatus || null,
            serviceStatus: serviceStatus || null,
            serviceId: serviceId || null,
            createdById: createdById || null,
            leadOwnerId: leadOwnerId || null,
            teamId: teamId || null,
            leadAssignment: leadAssignment || null,
            leadRecycleCount: leadRecycleCount || null,
            mobile: mobile || null,
            paidRange: paidRange || null,
            ...customFilters,
          };

          const res = await fetchCountsAction(payload);
          if (res.success) {
            setData(res);
          } else {
            setError(res.error || "Failed to load lead count breakdown.");
          }
        } catch {
          setError("An unexpected error occurred while loading counts.");
        }
      });
    },
    [
      fetchCountsAction,
      lastUpdateDateType,
      startDate,
      endDate,
      leadSource,
      leadResponse,
      trialStatus,
      serviceStatus,
      serviceId,
      createdById,
      leadOwnerId,
      teamId,
      leadAssignment,
      leadRecycleCount,
      mobile,
      paidRange,
    ]
  );

  // Initial load
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Handle Preset Clicks in Date Range Popover (matching datereange.PNG)
  const handleApplyPreset = (preset: PresetType) => {
    setActivePreset(preset);
    const currentDate = new Date();
    let s: Date;
    let e: Date;

    if (preset === "Today") {
      s = new Date(currentDate);
      e = new Date(currentDate);
    } else if (preset === "Yesterday") {
      s = new Date(currentDate);
      s.setDate(s.getDate() - 1);
      e = new Date(s);
    } else if (preset === "Last 7 Days") {
      e = new Date(currentDate);
      s = new Date(currentDate);
      s.setDate(s.getDate() - 6);
    } else if (preset === "Last 30 Days") {
      e = new Date(currentDate);
      s = new Date(currentDate);
      s.setDate(s.getDate() - 29);
    } else if (preset === "This Month") {
      s = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      e = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else if (preset === "Last Month") {
      s = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      e = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    } else {
      // Custom Range
      return;
    }

    const startIso = formatDateISO(s);
    const endIso = formatDateISO(e);

    setStartDate(startIso);
    setEndDate(endIso);
    setTempDateRange({ start: startIso, end: endIso });

    setCal1Year(s.getFullYear());
    setCal1Month(s.getMonth());

    loadCounts({ startDate: startIso, endDate: endIso });
  };

  // Calendar day click handler
  const handleDayClick = (dateStr: string) => {
    setActivePreset("Custom Range");
    if (!tempDateRange.start || (tempDateRange.start && tempDateRange.end)) {
      setTempDateRange({ start: dateStr, end: null });
    } else {
      let finalStart = tempDateRange.start;
      let finalEnd = dateStr;
      if (finalEnd < finalStart) {
        const swap = finalStart;
        finalStart = finalEnd;
        finalEnd = swap;
      }
      setTempDateRange({ start: finalStart, end: finalEnd });
      setStartDate(finalStart);
      setEndDate(finalEnd);
      loadCounts({ startDate: finalStart, endDate: finalEnd });
    }
  };

  // Navigate Calendars backward
  const handlePrevMonth = () => {
    if (cal1Month === 0) {
      setCal1Month(11);
      setCal1Year((prev) => prev - 1);
    } else {
      setCal1Month((prev) => prev - 1);
    }
  };

  // Navigate Calendars forward
  const handleNextMonth = () => {
    if (cal1Month === 11) {
      setCal1Month(0);
      setCal1Year((prev) => prev + 1);
    } else {
      setCal1Month((prev) => prev + 1);
    }
  };

  // Deduplicate breakdown items by canonical key/label
  const uniqueBreakdown = (() => {
    if (!data?.breakdown) return [];
    const seen = new Set<string>();
    return data.breakdown.filter((item) => {
      const id = `${item.type}:${item.label.toLowerCase()}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  })();

  // Deduplicate sources and responses case-insensitively
  const uniqueSources = (() => {
    if (!data?.sources) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of data.sources) {
      const key = s.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(s.trim());
      }
    }
    return list;
  })();

  const uniqueResponses = (() => {
    if (!data?.responses) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const r of data.responses) {
      const key = r.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(r.trim());
      }
    }
    return list;
  })();

  // Handle Select All
  const handleToggleSelectAll = () => {
    if (!uniqueBreakdown.length) return;
    if (selectedKeys.size === uniqueBreakdown.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(uniqueBreakdown.map((item) => item.key)));
    }
  };

  const handleToggleItem = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSearchAndApply = () => {
    const stages: string[] = [];
    const responses: string[] = [];

    if (uniqueBreakdown.length > 0) {
      for (const item of uniqueBreakdown) {
        if (selectedKeys.has(item.key)) {
          if (item.type === "stage") {
            stages.push(item.value);
          } else if (item.type === "response") {
            responses.push(item.value);
          }
        }
      }
    }

    const payload: LeadCountFilterApplyPayload = {
      selectedKeys: Array.from(selectedKeys),
      selectedStages: stages,
      selectedResponses: responses,
      lastUpdateDateType: lastUpdateDateType || null,
      lastUpdateDate: null,
      startDate: startDate || null,
      endDate: endDate || null,
      leadSource: leadSource || null,
      leadResponse: leadResponse || null,
      trialStatus: trialStatus || null,
      serviceStatus: serviceStatus || null,
      serviceId: serviceId || null,
      createdById: createdById || null,
      leadOwnerId: leadOwnerId || null,
      teamId: teamId || null,
      leadAssignment: leadAssignment || null,
      leadRecycleCount: leadRecycleCount || null,
      paidRange: paidRange || null,
      mobile: mobile || null,
    };

    if (onApplyFilters) {
      onApplyFilters(payload);
    }
    onClose();
  };

  const handleResetFilters = () => {
    setLastUpdateDateType("");
    setStartDate("");
    setEndDate("");
    setLeadSource("");
    setLeadResponse("");
    setTrialStatus("");
    setServiceStatus("");
    setServiceId("");
    setCreatedById("");
    setLeadOwnerId("");
    setTeamId("");
    setLeadAssignment("");
    setLeadRecycleCount("");
    setPaidRange("");
    setMobile("");
    setSelectedKeys(new Set());
    setActivePreset("");
    setTempDateRange({ start: null, end: null });

    loadCounts({
      lastUpdateDateType: null,
      lastUpdateDate: null,
      startDate: null,
      endDate: null,
      leadSource: null,
      leadResponse: null,
      trialStatus: null,
      serviceStatus: null,
      serviceId: null,
      createdById: null,
      leadOwnerId: null,
      teamId: null,
      leadAssignment: null,
      leadRecycleCount: null,
      mobile: null,
      paidRange: null,
    });

    if (onResetFilters) {
      onResetFilters();
    }
  };

  // Formatted date range label for the input display
  let dateRangeDisplayText = "";
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      dateRangeDisplayText = `${formatDateDisplay(s)} - ${formatDateDisplay(e)}`;
    }
  } else if (startDate) {
    const s = new Date(startDate);
    if (!isNaN(s.getTime())) {
      dateRangeDisplayText = `${formatDateDisplay(s)} - ...`;
    }
  }

  // Build Options for Searchable Dropdowns
  // 1. Lead Added By: Admin along with all employees
  const leadAddedByOptions: SearchableOption[] = [
    { value: "", label: "-- Lead Added By --" },
  ];
  if (data?.users && data.users.length > 0) {
    const admins = data.users.filter((u) => u.role === "ADMIN");
    const others = data.users.filter((u) => u.role !== "ADMIN");

    if (admins.length > 0) {
      for (const adm of admins) {
        leadAddedByOptions.push({
          value: adm.id,
          label: `${adm.name} (Admin)`,
        });
      }
    }
    for (const usr of others) {
      leadAddedByOptions.push({
        value: usr.id,
        label: usr.name,
      });
    }
  } else if (data?.creators) {
    for (const c of data.creators) {
      leadAddedByOptions.push({
        value: c.id,
        label: c.name,
      });
    }
  }

  // 2. Lead Owner: matching image 1
  const leadOwnerOptions: SearchableOption[] = [
    { value: "", label: "-- Lead Owner --" },
    { value: "DEACTIVATED", label: "Deactivated Lead Owner" },
  ];
  if (data?.users && data.users.length > 0) {
    for (const u of data.users) {
      leadOwnerOptions.push({
        value: u.id,
        label: u.name,
      });
    }
  } else if (data?.employeeName) {
    leadOwnerOptions.push({
      value: "ME",
      label: data.employeeName,
    });
  }

  // 3. Team: matching image 2
  const teamOptions: SearchableOption[] = [
    { value: "", label: "-- Team --" },
  ];
  if (data?.teams && data.teams.length > 0) {
    for (const t of data.teams) {
      teamOptions.push({
        value: t.id,
        label: t.name,
      });
    }
  } else if (data?.employeeTeamName) {
    teamOptions.push({
      value: "MY_TEAM",
      label: data.employeeTeamName,
    });
  }

  // 4. Lead Assignment: matching image 3
  const leadAssignmentOptions: SearchableOption[] = [
    { value: "", label: "-- Lead Assignment --" },
    { value: "Fetched Leads", label: "Fetched Leads" },
    { value: "Alloted Leads", label: "Alloted Leads" },
    { value: "Transferred Leads", label: "Transferred Leads" },
  ];

  // Render Month Calendar helper
  const renderCalendar = (year: number, month: number, isRightCal: boolean) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: React.ReactNode[] = [];

    // Prev month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      cells.push(
        <div
          key={`prev-${dayNum}`}
          className="h-8 flex items-center justify-center text-xs text-slate-300 dark:text-slate-600 select-none cursor-default"
        >
          {dayNum}
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(month + 1).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const selStart = tempDateRange.start || startDate;
      const selEnd = tempDateRange.end || endDate;

      const isStart = selStart === dateStr;
      const isEnd = selEnd === dateStr;
      const isInRange =
        selStart && selEnd && dateStr > selStart && dateStr < selEnd;

      let cellStyle =
        "h-8 flex items-center justify-center text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors";

      if (isStart || isEnd) {
        cellStyle =
          "h-8 flex items-center justify-center text-xs bg-[#0284c7] text-white font-semibold rounded cursor-pointer shadow-xs";
      } else if (isInRange) {
        cellStyle =
          "h-8 flex items-center justify-center text-xs bg-sky-100 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200 cursor-pointer";
      }

      cells.push(
        <div
          key={`cur-${day}`}
          onClick={() => handleDayClick(dateStr)}
          className={cellStyle}
        >
          {day}
        </div>
      );
    }

    // Next month leading days (fill up to 35 or 42 cells)
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push(
        <div
          key={`next-${i}`}
          className="h-8 flex items-center justify-center text-xs text-slate-300 dark:text-slate-600 select-none cursor-default"
        >
          {i}
        </div>
      );
    }

    return (
      <div className="w-[200px] sm:w-[220px]">
        {/* Month & Year Select Bar */}
        <div className="flex items-center justify-between mb-2">
          {!isRightCal ? (
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className="flex items-center gap-1.5">
            <select
              value={month}
              onChange={(e) => {
                const newM = parseInt(e.target.value, 10);
                if (!isRightCal) {
                  setCal1Month(newM);
                } else {
                  setCal1Month((newM - 1 + 12) % 12);
                }
              }}
              className="text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.1] rounded px-1.5 py-0.5 cursor-pointer focus:outline-none"
            >
              {MONTH_NAMES.map((mName, mIdx) => (
                <option key={mName} value={mIdx}>
                  {mName}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => {
                const newY = parseInt(e.target.value, 10);
                if (!isRightCal) {
                  setCal1Year(newY);
                } else {
                  setCal1Year(month === 0 ? newY - 1 : newY);
                }
              }}
              className="text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.1] rounded px-1.5 py-0.5 cursor-pointer focus:outline-none"
            >
              {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {isRightCal ? (
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((dName) => (
            <div
              key={dName}
              className="text-[11px] font-bold text-center text-slate-500 dark:text-slate-400 py-1"
            >
              {dName}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-0.5">{cells}</div>
      </div>
    );
  };

  // Compute total of selected rows
  const selectedTotal = uniqueBreakdown
    .filter((b) => selectedKeys.has(b.key))
    .reduce((sum, b) => sum + b.count, 0);

  const isAllSelected =
    uniqueBreakdown.length > 0 && selectedKeys.size === uniqueBreakdown.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Main Dialog Card matching Screenshot (165).jpg */}
      <div className="relative w-full max-w-5xl rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/[0.1] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <TableProperties className="size-5 text-slate-700 dark:text-slate-300" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              ALL Lead Count
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Filter className="size-3.5 text-slate-500" />
              <span>Filters</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* 2-Column Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Disposition & Stage Breakdown Table (7 cols on desktop) */}
          <div className="md:col-span-7 flex flex-col rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/40 shadow-2xs overflow-hidden">
            {/* Table Container */}
            <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-slate-100 dark:divide-white/[0.05]">
              {/* Select All Row */}
              <div
                onClick={handleToggleSelectAll}
                className="px-4 py-2.5 flex items-center gap-3 bg-slate-50/70 dark:bg-slate-900/70 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors select-none"
              >
                <input
                  type="checkbox"
                  checked={isAllSelected ?? false}
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select All
                </span>
              </div>

              {/* Breakdown Rows (Clean & Deduplicated) */}
              {isPending && !data ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="size-6 animate-spin text-cyan-500" />
                  <span>Computing disposition counts...</span>
                </div>
              ) : uniqueBreakdown.length > 0 ? (
                uniqueBreakdown.map((item: DispositionBreakdownItem) => {
                  const isChecked = selectedKeys.has(item.key);

                  // Color styling matching Screenshot (165).jpg
                  let labelColor = "text-slate-700 dark:text-slate-300";
                  if (item.value === "UNREAD") {
                    labelColor = "text-blue-600 dark:text-blue-400 font-semibold";
                  } else if (
                    ["FOLLOW_UP", "TRIAL", "CLIENT"].includes(item.value)
                  ) {
                    labelColor = "text-teal-600 dark:text-teal-400 font-semibold";
                  }

                  return (
                    <div
                      key={item.key}
                      onClick={() => handleToggleItem(item.key)}
                      className={`px-4 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer select-none ${isChecked
                        ? "bg-cyan-500/10 dark:bg-cyan-950/30"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleItem(item.key)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className={`truncate ${labelColor}`}>
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onSelectStageOrResponse && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onApplyFilters) {
                                onApplyFilters({
                                  selectedKeys: [item.key],
                                  selectedStages:
                                    item.type === "stage" ? [item.value] : [],
                                  selectedResponses:
                                    item.type === "response"
                                      ? [item.value]
                                      : [],
                                  lastUpdateDateType:
                                    lastUpdateDateType || null,
                                  lastUpdateDate: null,
                                  startDate: startDate || null,
                                  endDate: endDate || null,
                                  leadSource: leadSource || null,
                                  leadResponse: leadResponse || null,
                                  trialStatus: trialStatus || null,
                                  serviceStatus: serviceStatus || null,
                                  serviceId: serviceId || null,
                                  createdById: createdById || null,
                                  leadOwnerId: leadOwnerId || null,
                                  teamId: teamId || null,
                                  leadAssignment: leadAssignment || null,
                                  leadRecycleCount: leadRecycleCount || null,
                                  paidRange: paidRange || null,
                                  mobile: mobile || null,
                                });
                              }
                              onSelectStageOrResponse({
                                type: item.type,
                                value: item.value,
                              });
                              onClose();
                            }}
                            className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                            title="Filter list by this item"
                          >
                            View
                          </button>
                        )}
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200 min-w-[36px] text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No leads found matching current filters.
                </div>
              )}
            </div>

            {/* Sticky Summary Footer */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span>
                {selectedKeys.size > 0
                  ? `Selected (${selectedKeys.size})`
                  : "Total"}
              </span>
              <span className="font-mono text-sm">
                {selectedKeys.size > 0
                  ? `${selectedTotal} / ${data?.totalCount ?? 0}`
                  : (data?.totalCount ?? 0)}
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Quick Filters Panel (5 cols on desktop - EXACT order from Screenshot (165).jpg) */}
          <div className="md:col-span-5 space-y-2.5">
            {/* 1. Last Update Date (Dropdown with 10 options) */}
            <div className="relative flex items-center px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs">
              <Calendar className="size-4 text-purple-600 dark:text-purple-400 mr-2 shrink-0" />
              <select
                value={lastUpdateDateType}
                onChange={(e) => {
                  setLastUpdateDateType(e.target.value);
                  loadCounts({ lastUpdateDateType: e.target.value });
                }}
                className="w-full bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer appearance-none pr-5"
              >
                <option value="">Last Update Date</option>
                {LAST_UPDATE_DATE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>

            {/* 2. Date Range Input + Interactive Popover matching datereange.PNG */}
            <div className="relative" ref={datePopoverRef}>
              <div
                onClick={() => setIsDatePopoverOpen((prev) => !prev)}
                className="flex items-center px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs cursor-pointer hover:border-slate-300 dark:hover:border-white/[0.2] transition-colors"
              >
                <Calendar className="size-4 text-purple-600 dark:text-purple-400 mr-2 shrink-0" />
                <input
                  type="text"
                  readOnly
                  placeholder="Date Range"
                  value={dateRangeDisplayText}
                  className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none cursor-pointer"
                />
                {startDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStartDate("");
                      setEndDate("");
                      setTempDateRange({ start: null, end: null });
                      setActivePreset("");
                      loadCounts({ startDate: null, endDate: null });
                    }}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Clear Date Range"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Date Range Popover matching datereange.PNG */}
              {isDatePopoverOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-4 flex flex-col sm:flex-row gap-4 animate-in fade-in zoom-in-95 duration-100">
                  {/* Upward pointer arrow matching datereange.PNG */}
                  <div className="hidden sm:block absolute -top-1.5 right-12 w-3 h-3 bg-white dark:bg-[#0c1220] border-t border-l border-slate-200 dark:border-white/[0.1] rotate-45" />

                  {/* Left Column: Preset Buttons */}
                  <div className="w-full sm:w-[130px] flex flex-col gap-1 border-b sm:border-b-0 sm:border-r border-slate-200/80 dark:border-white/[0.08] pb-3 sm:pb-0 sm:pr-3">
                    {PRESETS.map((p) => {
                      const isActive = activePreset === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleApplyPreset(p)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${isActive
                            ? "bg-[#0284c7] text-white shadow-xs"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Column: Dual Month Calendar */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {renderCalendar(cal1Year, cal1Month, false)}
                    {renderCalendar(cal2Year, cal2Month, true)}
                  </div>
                </div>
              )}
            </div>

            {/* 3. -- Source -- Dropdown (Deduplicated) */}
            <div className="relative">
              <select
                value={leadSource}
                onChange={(e) => {
                  setLeadSource(e.target.value);
                  loadCounts({ leadSource: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer appearance-none pr-8"
              >
                <option value="">-- Source --</option>
                {uniqueSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* 4. -- Call Response -- Dropdown (Deduplicated & Canonical) */}
            <div className="relative">
              <select
                value={leadResponse}
                onChange={(e) => {
                  setLeadResponse(e.target.value);
                  loadCounts({ leadResponse: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer appearance-none pr-8"
              >
                <option value="">-- Call Response --</option>
                {uniqueResponses.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* 5. -- Trial Status -- Dropdown */}
            <div className="relative">
              <select
                value={trialStatus}
                onChange={(e) => {
                  setTrialStatus(e.target.value);
                  loadCounts({ trialStatus: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer appearance-none pr-8"
              >
                <option value="">-- Trial Status --</option>
                <option value="APPROVED">Approved</option>
                <option value="RUNNING">Running</option>
                <option value="EXPIRED">Expired</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <ChevronDown className="size-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* 6. -- Service Status -- Dropdown */}
            <div className="relative">
              <select
                value={serviceStatus}
                onChange={(e) => {
                  setServiceStatus(e.target.value);
                  loadCounts({ serviceStatus: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer appearance-none pr-8"
              >
                <option value="">-- Service Status --</option>
                <option value="APPROVED">Approved</option>
                <option value="RUNNING">Running</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronDown className="size-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* 7. Service (Product) Dropdown */}
            <div className="relative">
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  loadCounts({ serviceId: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer appearance-none pr-8"
              >
                <option value="">Service</option>
                {data?.products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* 8. -- Lead Added By -- (Opens dropdown with Admin along with all employees) */}
            <div>
              <SearchableSelect
                value={createdById}
                onChange={(val) => {
                  setCreatedById(val);
                  loadCounts({ createdById: val });
                }}
                placeholder="-- Lead Added By --"
                options={leadAddedByOptions}
              />
            </div>

            {/* 9. -- Lead Owner -- (Matching Image 1: searchable dropdown with Deactivated Lead Owner & owners) */}
            <div>
              <SearchableSelect
                value={leadOwnerId}
                onChange={(val) => {
                  setLeadOwnerId(val);
                  loadCounts({ leadOwnerId: val });
                }}
                placeholder="-- Lead Owner --"
                options={leadOwnerOptions}
              />
            </div>

            {/* 10. -- Team -- (Matching Image 2: searchable dropdown with all teams) */}
            <div>
              <SearchableSelect
                value={teamId}
                onChange={(val) => {
                  setTeamId(val);
                  loadCounts({ teamId: val });
                }}
                placeholder="-- Team --"
                options={teamOptions}
              />
            </div>

            {/* 11. Lead Recycle Count */}
            <div>
              <input
                type="text"
                placeholder="Lead Recycle Count"
                value={leadRecycleCount}
                onChange={(e) => setLeadRecycleCount(e.target.value)}
                onBlur={() => loadCounts({ leadRecycleCount })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadCounts({ leadRecycleCount });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* 12. Paid Ex: 500-1000 */}
            <div className="flex items-center px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs">
              <IndianRupee className="size-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Paid Ex: 500-1000"
                value={paidRange}
                onChange={(e) => setPaidRange(e.target.value)}
                onBlur={() => loadCounts({ paidRange })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadCounts({ paidRange });
                }}
                className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* 13. -- Lead Assignment -- (Matching Image 3: Fetched, Alloted, Transferred Leads with search box) */}
            <div>
              <SearchableSelect
                value={leadAssignment}
                onChange={(val) => {
                  setLeadAssignment(val);
                  loadCounts({ leadAssignment: val });
                }}
                placeholder="-- Lead Assignment --"
                options={leadAssignmentOptions}
              />
            </div>

            {/* 14. Mobile */}
            <div className="flex items-center px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] text-xs">
              <Phone className="size-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                onBlur={() => loadCounts({ mobile })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadCounts({ mobile });
                }}
                className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Filter Action Buttons (Reset & Search) */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleSearchAndApply}
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
