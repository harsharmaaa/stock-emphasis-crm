"use client";

import { useState, useTransition } from "react";
import {
  type LifecycleSearchLead,
  type AllotmentUserOption,
  updateLeadDetailsAction,
} from "./actions";
import {
  LEAD_RESPONSE_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_PROFILE_OPTIONS,
  LEAD_EXPERIENCE_OPTIONS,
  mapStatusToLifecycleKey,
} from "@/src/lib/utils";
import {
  Phone,
  MessageSquare,
  Share2,
  EyeOff,
  Trash2,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  TrendingUp,
  Wallet,
  MapPin,
  User,
} from "lucide-react";

interface LeadEditTimelineProps {
  lead: LifecycleSearchLead;
  allotmentUsers: AllotmentUserOption[];
  onGoBack: () => void;
  onLeadUpdated?: (updatedLead: LifecycleSearchLead) => void;
  onNextLead?: () => void;
  onPrevLead?: () => void;
  hasNextLead?: boolean;
  hasPrevLead?: boolean;
}

type TabType = "BASIC" | "ADDRESS" | "OTHER" | "INVESTMENT";

export function LeadEditTimeline({
  lead,
  allotmentUsers,
  onGoBack,
  onLeadUpdated,
  onNextLead,
  onPrevLead,
  hasNextLead = false,
  hasPrevLead = false,
}: LeadEditTimelineProps) {
  const [activeTab, setActiveTab] = useState<TabType>("BASIC");
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: lead.name || "",
    mobile: lead.mobile || "",
    email: lead.email || "",
    alternateMobile: lead.alternateMobile || "",
    leadResponse: lead.leadResponse || "Interested",
    callbackDate: lead.callbackDate ? lead.callbackDate.slice(0, 16) : "",
    description: lead.description || "",
    state: lead.state || "",
    city: lead.city || "",
    district: lead.district || "",
    fatherName: lead.fatherName || "",
    dob: lead.dob ? lead.dob.slice(0, 10) : "",
    aadhar: lead.aadhar || "",
    pan: lead.pan || "",
    gstin: lead.gstin || "",
    occupation: lead.occupation || "",
    profile: lead.profile || "",
    experience: lead.experience || "",
    leadSource: lead.leadSource || "Premium Lead",
    allotToId: lead.allotToId || "",
    status: mapStatusToLifecycleKey(lead.status),
    investment: lead.investment || "",
    segment: lead.segment || "",
  });

  // Keep form in sync if active lead changes
  const [prevLead, setPrevLead] = useState(lead);
  if (lead !== prevLead) {
    setPrevLead(lead);
    setFormData({
      name: lead.name || "",
      mobile: lead.mobile || "",
      email: lead.email || "",
      alternateMobile: lead.alternateMobile || "",
      leadResponse: lead.leadResponse || "Interested",
      callbackDate: lead.callbackDate ? lead.callbackDate.slice(0, 16) : "",
      description: lead.description || "",
      state: lead.state || "",
      city: lead.city || "",
      district: lead.district || "",
      fatherName: lead.fatherName || "",
      dob: lead.dob ? lead.dob.slice(0, 10) : "",
      aadhar: lead.aadhar || "",
      pan: lead.pan || "",
      gstin: lead.gstin || "",
      occupation: lead.occupation || "",
      profile: lead.profile || "",
      experience: lead.experience || "",
      leadSource: lead.leadSource || "Premium Lead",
      allotToId: lead.allotToId || "",
      status: mapStatusToLifecycleKey(lead.status),
      investment: lead.investment || "",
      segment: lead.segment || "",
    });
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setSuccessMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await updateLeadDetailsAction({
          leadId: lead.id,
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          alternateMobile: formData.alternateMobile,
          leadResponse: formData.leadResponse,
          callbackDate: formData.callbackDate ? new Date(formData.callbackDate).toISOString() : null,
          description: formData.description,
          state: formData.state,
          city: formData.city,
          district: formData.district,
          fatherName: formData.fatherName,
          dob: formData.dob ? new Date(formData.dob).toISOString() : null,
          aadhar: formData.aadhar,
          pan: formData.pan,
          gstin: formData.gstin,
          occupation: formData.occupation,
          profile: formData.profile,
          experience: formData.experience,
          leadSource: formData.leadSource,
          allotToId: formData.allotToId || null,
          status: formData.status,
          investment: formData.investment,
          segment: formData.segment,
        });

        if (res.success) {
          setSuccessMessage("Lead updated successfully!");

          const selectedAssignee = allotmentUsers.find((u) => u.id === formData.allotToId);
          const updatedLead: LifecycleSearchLead = {
            ...lead,
            name: formData.name,
            mobile: formData.mobile,
            email: formData.email || null,
            alternateMobile: formData.alternateMobile || null,
            leadResponse: formData.leadResponse || null,
            callbackDate: formData.callbackDate ? new Date(formData.callbackDate).toISOString() : null,
            description: formData.description || null,
            state: formData.state || null,
            city: formData.city || null,
            district: formData.district || null,
            fatherName: formData.fatherName || null,
            dob: formData.dob ? new Date(formData.dob).toISOString() : null,
            aadhar: formData.aadhar || null,
            pan: formData.pan || null,
            gstin: formData.gstin || null,
            occupation: formData.occupation || null,
            profile: formData.profile || null,
            experience: formData.experience || null,
            leadSource: formData.leadSource || null,
            status: formData.status,
            investment: formData.investment || null,
            segment: formData.segment || null,
            allotToId: formData.allotToId || null,
            allotTo: selectedAssignee
              ? {
                  id: selectedAssignee.id,
                  name: selectedAssignee.name,
                  email: selectedAssignee.email,
                  role: selectedAssignee.role,
                  teamName: selectedAssignee.teamName,
                }
              : null,
            ownerName: selectedAssignee ? selectedAssignee.name : "Admin",
            ownerRole: selectedAssignee ? selectedAssignee.role : "ADMIN",
            updatedAt: new Date().toISOString(),
          };

          onLeadUpdated?.(updatedLead);
        } else {
          setErrorMessage(res.error || "Failed to update lead details.");
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    });
  };

  const formattedUpdatedDate = lead.updatedAt
    ? new Date(lead.updatedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "01-Jan-1970";

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Top Controls Bar (Image 3) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* < Button (Orange) */}
          <button
            type="button"
            onClick={onPrevLead}
            disabled={!hasPrevLead}
            title="Previous lead"
            className="px-3 py-1.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-40 text-white font-bold text-xs transition-colors flex items-center justify-center shadow-2xs"
          >
            &lt;
          </button>

          {/* Module Buttons (Sky Blue) */}
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-2xs"
          >
            <span>Trial</span>
            <ChevronDown className="size-3 opacity-80" />
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-2xs"
          >
            <span>Payment</span>
            <ChevronDown className="size-3 opacity-80" />
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-2xs"
          >
            <span>Invoice</span>
            <ChevronDown className="size-3 opacity-80" />
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-2xs"
          >
            <span>Agreement</span>
            <ChevronDown className="size-3 opacity-80" />
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold text-xs transition-colors shadow-2xs"
          >
            Risk
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold text-xs transition-colors shadow-2xs"
          >
            SMS
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold text-xs transition-colors shadow-2xs"
          >
            Email
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold text-xs transition-colors shadow-2xs"
          >
            Calls
          </button>

          {/* Timeline Tab Active (Royal Blue) */}
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg bg-[#2563eb] text-white font-semibold text-xs shadow-2xs"
          >
            Timeline
          </button>
        </div>

        {/* Right Icon & Navigation Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Add Remark"
            className="p-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white transition-colors shadow-2xs"
          >
            <MessageSquare className="size-3.5" />
          </button>

          <button
            type="button"
            title="Share Lead"
            className="p-2 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white transition-colors shadow-2xs"
          >
            <Share2 className="size-3.5" />
          </button>

          <button
            type="button"
            title="Hide Lead"
            className="p-2 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white transition-colors shadow-2xs"
          >
            <EyeOff className="size-3.5" />
          </button>

          <button
            type="button"
            title="Delete Lead"
            onClick={() => {
              if (confirm("Move lead to Deleted status?")) {
                setFormData((p) => ({ ...p, status: "DELETED" }));
              }
            }}
            className="p-2 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-white transition-colors shadow-2xs"
          >
            <Trash2 className="size-3.5" />
          </button>

          {/* -> Go Back Button (Orange) */}
          <button
            type="button"
            onClick={onGoBack}
            className="px-3.5 py-1.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <ArrowLeft className="size-3.5" />
            <span>Go Back</span>
          </button>

          {/* > Button (Orange) */}
          <button
            type="button"
            onClick={onNextLead}
            disabled={!hasNextLead}
            title="Next lead"
            className="px-3 py-1.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-40 text-white font-bold text-xs transition-colors flex items-center justify-center shadow-2xs"
          >
            &gt;
          </button>
        </div>
      </div>

      {/* 2. Lead Metadata Sub-header (Image 3 + Advisory Detail Strip) */}
      <div className="rounded-xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] p-3.5 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left Metadata */}
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Lead Owner: <span className="text-blue-600 dark:text-blue-400">{lead.ownerName || "Admin"}</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
              Lead Source: <span className="font-medium text-slate-600 dark:text-slate-300">{formData.leadSource || lead.leadSource || "Premium Lead"}</span>
            </div>
          </div>

          {/* Right Metadata & Action Pills */}
          <div className="flex flex-col sm:items-end gap-1">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Lead Id: <span className="font-mono text-blue-600 dark:text-blue-400">#{lead.id.slice(-7)}</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-400">
              Last Updated: {formattedUpdatedDate}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setFormData((p) => ({
                    ...p,
                    status: "FOLLOW_UP",
                    leadResponse: "Callback",
                  }));
                  setActiveTab("BASIC");
                }}
                className="px-3 py-1 rounded-full border border-sky-400 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-xs font-medium transition-colors"
              >
                + Add to Followup
              </button>

              <span className="px-3 py-1 rounded-full border border-sky-400 text-sky-600 dark:text-sky-400 text-xs font-medium uppercase font-semibold">
                {mapStatusToLifecycleKey(formData.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Advisory Profile Badges (Instant visibility for 150+ Stock Advisory floor) */}
        <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/[0.05] flex flex-wrap items-center gap-2 text-xs">
          {/* Advisory Segment */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300">
            <TrendingUp className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">Segment:</span>
            <span className="font-bold">{formData.segment || lead.segment || "General Advisory"}</span>
          </div>

          {/* Investment Capital */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300">
            <Wallet className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Capital:</span>
            <span className="font-bold">{formData.investment || lead.investment || "Not Specified"}</span>
          </div>

          {/* Location */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300">
            <MapPin className="size-3.5 text-slate-500 shrink-0" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Location:</span>
            <span className="font-semibold">
              {[formData.city || lead.city, formData.state || lead.state].filter(Boolean).join(", ") || "India"}
            </span>
          </div>

          {/* Profile / Client Type */}
          {(formData.profile || lead.profile) && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 text-amber-700 dark:text-amber-300">
              <User className="size-3.5 text-amber-600 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Profile:</span>
              <span className="font-semibold">{formData.profile || lead.profile}</span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback alerts */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3. Main Form & Action Timeline Card (Image 3) */}
      <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#0c1220]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-md space-y-6">
        <div className="grid grid-cols-12 gap-5">
          {/* Left Column: Vertical Tabs */}
          <div className="col-span-12 sm:col-span-3 lg:col-span-2 space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("BASIC")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "BASIC"
                  ? "bg-[#3b82f6] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
              }`}
            >
              Basic Details
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ADDRESS")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "ADDRESS"
                  ? "bg-[#3b82f6] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
              }`}
            >
              Address
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("OTHER")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "OTHER"
                  ? "bg-[#3b82f6] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
              }`}
            >
              Other
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("INVESTMENT")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "INVESTMENT"
                  ? "bg-[#3b82f6] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
              }`}
            >
              Investment
            </button>
          </div>

          {/* Middle Column: Form Inputs */}
          <div className="col-span-12 sm:col-span-9 lg:col-span-7">
            {activeTab === "BASIC" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Sub-column */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Mobile
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <a
                        href={`tel:${formData.mobile}`}
                        title="Call Number"
                        className="p-2 rounded-lg bg-[#2dd4bf] hover:bg-[#14b8a6] text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs"
                      >
                        <Phone className="size-4" />
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Alternate
                    </label>
                    <input
                      type="tel"
                      name="alternateMobile"
                      value={formData.alternateMobile}
                      onChange={handleInputChange}
                      placeholder="Alternate Mobile"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Right Sub-column */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Response
                    </label>
                    <select
                      name="leadResponse"
                      value={formData.leadResponse}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {LEAD_RESPONSE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Call Back
                    </label>
                    <input
                      type="datetime-local"
                      name="callbackDate"
                      value={formData.callbackDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Comment
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Start typing here..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ADDRESS" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    placeholder="District"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {activeTab === "OTHER" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Father Name
                  </label>
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Aadhar
                  </label>
                  <input
                    type="text"
                    name="aadhar"
                    value={formData.aadhar}
                    onChange={handleInputChange}
                    placeholder="12-digit Aadhar"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    name="pan"
                    value={formData.pan}
                    onChange={handleInputChange}
                    placeholder="PAN Number"
                    className="w-full px-3 py-2 text-xs font-mono uppercase rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleInputChange}
                    placeholder="GSTIN"
                    className="w-full px-3 py-2 text-xs font-mono uppercase rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleInputChange}
                    placeholder="Occupation"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Profile
                  </label>
                  <select
                    name="profile"
                    value={formData.profile}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select profile</option>
                    {LEAD_PROFILE_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Experience
                  </label>
                  <select
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select experience</option>
                    {LEAD_EXPERIENCE_OPTIONS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Lead Source
                  </label>
                  <select
                    name="leadSource"
                    value={formData.leadSource}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {LEAD_SOURCE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Lead Owner (Assignee)
                  </label>
                  <select
                    name="allotToId"
                    value={formData.allotToId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Unassigned (Admin Default)</option>
                    {allotmentUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}) {u.teamName ? `• ${u.teamName}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Lifecycle Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="READ">Read</option>
                    <option value="UNREAD">Unread</option>
                    <option value="FOLLOW_UP">Followups</option>
                    <option value="TRIAL">Trials</option>
                    <option value="CLIENT">Clients</option>
                    <option value="DISPOSED">Disposed</option>
                    <option value="DELETED">Deleted</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === "INVESTMENT" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Investment Capital
                  </label>
                  <input
                    type="text"
                    name="investment"
                    value={formData.investment}
                    onChange={handleInputChange}
                    placeholder="e.g. 50,000 - 1,00,000"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Segment
                  </label>
                  <input
                    type="text"
                    name="segment"
                    value={formData.segment}
                    onChange={handleInputChange}
                    placeholder="e.g. Equity Cash, Options, Future"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: "Last Updated:" Action Box (Image 3) */}
          <div className="col-span-12 lg:col-span-3">
            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-blue-500" />
                  <span>Last Updated:</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {formattedUpdatedDate}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="text-slate-700 dark:text-slate-300">
                  <span className="text-slate-400">Response:</span>{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {formData.leadResponse || lead.leadResponse || "Interested"}
                  </span>
                </div>

                <div className="text-slate-700 dark:text-slate-300">
                  <span className="text-slate-400">Callback:</span>{" "}
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {formData.callbackDate
                      ? new Date(formData.callbackDate).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Not scheduled"}
                  </span>
                </div>

                <div className="text-slate-700 dark:text-slate-300">
                  <span className="text-slate-400">Comment:</span>
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-white/[0.06] line-clamp-3">
                    {formData.description || lead.description || "No comment logged"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Bottom Action Buttons (Image 3 - Save button ONLY) */}
        <div className="pt-4 border-t border-slate-200/70 dark:border-white/[0.08] flex items-center justify-center">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isPending}
            className="px-8 py-2.5 rounded-lg bg-[#06b6d4] hover:bg-[#0891b2] disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* 5. Footer (Image 3) */}
      <footer className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">
        © Stock Emphasis v1.2.0. All rights reserved.
      </footer>
    </div>
  );
}
