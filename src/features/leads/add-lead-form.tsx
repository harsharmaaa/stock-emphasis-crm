"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createLeadAction,
  checkPhoneDuplicateAction,
  type AllotmentUserOption,
  type CreateLeadInput,
} from "./actions";
import {
  LEAD_RESPONSE_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_PROFILE_OPTIONS,
  LEAD_EXPERIENCE_OPTIONS,
} from "@/src/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Layers,
  UserX,
  EyeOff,
  Eye,
  CalendarClock,
  ScrollText,
  Contact,
  CircleOff,
  Download,
  Settings,
  Save,
} from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
];

interface AddLeadFormProps {
  allotmentUsers: AllotmentUserOption[];
}

export function AddLeadForm({ allotmentUsers }: AddLeadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form fields state
  const [formData, setFormData] = useState<CreateLeadInput>({
    name: "",
    mobile: "",
    email: "",
    allotToId: "",
    district: "",
    alternateMobile: "",
    dob: "",
    aadhar: "",
    fatherName: "",
    state: "",
    city: "",
    pan: "",
    gstin: "",
    occupation: "",
    segment: "",
    investment: "",
    profile: "",
    leadResponse: "Interested",
    leadSource: "Fresh Lead",
    description: "",
    experience: "",
    status: "UNFOLLOWED",
    callbackDate: "",
  });

  // Phone duplicate state
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneDuplicateError, setPhoneDuplicateError] = useState<string | null>(null);

  // Form submission status
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Check phone duplicate on blur or debounce
  const handleMobileBlur = useCallback(async () => {
    const mobile = formData.mobile?.trim();
    if (!mobile || mobile.length < 10) {
      setPhoneDuplicateError(null);
      return;
    }

    setPhoneChecking(true);
    try {
      const res = await checkPhoneDuplicateAction(mobile);
      if (res.isDuplicate) {
        setPhoneDuplicateError("This number already exists.");
      } else {
        setPhoneDuplicateError(null);
      }
    } catch {
      // In case of network check failure, server validation on submit will enforce safety
    } finally {
      setPhoneChecking(false);
    }
  }, [formData.mobile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Reset duplicate warning if user changes mobile
    if (name === "mobile") {
      setPhoneDuplicateError(null);
      setFormError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Basic client validation
    if (!formData.name?.trim() || formData.name.trim().length < 2) {
      setFormError("Lead Name is required (minimum 2 characters).");
      return;
    }

    if (!formData.mobile?.trim() || formData.mobile.trim().length < 10) {
      setFormError("Valid 10-digit Mobile number is required.");
      return;
    }

    if (phoneDuplicateError) {
      setFormError("This number already exists.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createLeadAction(formData);

        if (!res.success) {
          setFormError(res.error || "Failed to create lead.");
          if (res.error === "This number already exists.") {
            setPhoneDuplicateError("This number already exists.");
          }
          return;
        }

        setFormSuccess(`Lead "${formData.name.trim()}" has been recorded successfully!`);

        // Reset form fields
        setFormData({
          name: "",
          mobile: "",
          email: "",
          allotToId: "",
          district: "",
          alternateMobile: "",
          dob: "",
          aadhar: "",
          fatherName: "",
          state: "",
          city: "",
          pan: "",
          gstin: "",
          occupation: "",
          segment: "",
          investment: "",
          profile: "",
          leadResponse: "Interested",
          leadSource: "Direct Call",
          description: "",
          experience: "",
          status: "UNFOLLOWED",
          callbackDate: "",
        });
        setPhoneDuplicateError(null);
      } catch {
        setFormError("An unexpected system error occurred while saving the lead.");
      }
    });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Filter / Status Pills Bar */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Active Add Lead button */}
          <Link
            href="/admin/leads/add"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs hover:brightness-110 transition-all"
          >
            <Plus className="size-3.5" />
            <span>Add</span>
          </Link>
          <Link
            href="/admin/leads?status=ALL"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-white/[0.06] hover:bg-violet-500/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md shadow-xs transition-colors"
          >
            <Layers className="size-3.5" />
            <span>All</span>
            <span className="text-[10px] opacity-75">73744</span>
          </Link>
          <Link
            href="/admin/leads?status=UNALLOTTED"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-white/[0.06] hover:bg-violet-500/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md shadow-xs transition-colors"
          >
            <UserX className="size-3.5" />
            <span>Unallotted</span>
            <span className="text-[10px] opacity-75">10068</span>
          </Link>
          <Link
            href="/admin/leads?status=UNREAD"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-white/[0.06] hover:bg-violet-500/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md shadow-xs transition-colors"
          >
            <EyeOff className="size-3.5" />
            <span>Unread</span>
            <span className="text-[10px] opacity-75">645</span>
          </Link>
          <Link
            href="/admin/leads?status=READ"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-white/[0.06] hover:bg-violet-500/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md shadow-xs transition-colors"
          >
            <Eye className="size-3.5" />
            <span>Read</span>
            <span className="text-[10px] opacity-75">702057</span>
          </Link>
          <Link
            href="/admin/leads?status=FOLLOW_UP"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-white/[0.06] hover:bg-violet-500/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md shadow-xs transition-colors"
          >
            <CalendarClock className="size-3.5" />
            <span>Followups</span>
            <span className="text-[10px] opacity-75">78</span>
          </Link>
          <Link
            href="/admin/leads?status=TRIALS"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-white/[0.06] hover:bg-violet-500/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md shadow-xs transition-colors"
          >
            <ScrollText className="size-3.5" />
            <span>Trials</span>
            <span className="text-[10px] opacity-75">24</span>
          </Link>
          <Link
            href="/admin/leads?status=CLIENTS"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-white/[0.06] hover:bg-violet-500/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md shadow-xs transition-colors"
          >
            <Contact className="size-3.5" />
            <span>Clients</span>
            <span className="text-[10px] opacity-75">580</span>
          </Link>
          <Link
            href="/admin/leads?status=DISPOSED"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-white/[0.06] hover:bg-violet-500/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md shadow-xs transition-colors"
          >
            <CircleOff className="size-3.5" />
            <span>Disposed</span>
            <span className="text-[10px] opacity-75">38161</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => router.push("/admin/leads")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-xs transition-all shrink-0"
        >
          <Download className="size-3.5" />
          <span>Fetch</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {formSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-xs font-semibold">{formSuccess}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => router.push("/admin/leads")}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              Directory
            </button>
            <button
              type="button"
              onClick={() => setFormSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error Notification Banner */}
      {formError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="size-4.5 text-rose-600 dark:text-rose-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Error: </span>
            {formError}
          </div>
        </div>
      )}

      {/* The Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CARD 1: Basic Details */}
        <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] overflow-hidden">
          <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.08] text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Basic Details</span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Primary contact & identification</span>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-3.5">
            {/* LEFT COLUMN */}
            <div className="space-y-3.5">
              {/* Allot To */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Allot To
                </label>
                <div className="col-span-8">
                  <select
                    name="allotToId"
                    value={formData.allotToId || ""}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {allotmentUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mobile */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Mobile <span className="text-rose-500">*</span>
                </label>
                <div className="col-span-8">
                  <div className="relative">
                    <input
                      type="tel"
                      name="mobile"
                      required
                      value={formData.mobile}
                      onChange={handleChange}
                      onBlur={handleMobileBlur}
                      placeholder="Mobile"
                      className={`w-full h-8 px-2.5 text-xs rounded-md border bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none ${
                        phoneDuplicateError
                          ? "border-rose-500 text-rose-600 focus:border-rose-600"
                          : "border-slate-250 dark:border-slate-800 focus:border-blue-500"
                      }`}
                    />
                    {phoneChecking && (
                      <span className="absolute right-2 top-2 text-[10px] text-slate-400">
                        <Loader2 className="size-3 animate-spin" />
                      </span>
                    )}
                  </div>
                  {phoneDuplicateError && (
                    <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                      {phoneDuplicateError}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Email
                </label>
                <div className="col-span-8">
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleChange}
                    placeholder="Email"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* District */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  District
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    name="district"
                    value={formData.district || ""}
                    onChange={handleChange}
                    placeholder="Select"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Alternate Mobile */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Alternate Mobile
                </label>
                <div className="col-span-8">
                  <input
                    type="tel"
                    name="alternateMobile"
                    value={formData.alternateMobile || ""}
                    onChange={handleChange}
                    placeholder="Alternate Mobile"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* DOB */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  DOB
                </label>
                <div className="col-span-8">
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob || ""}
                    onChange={handleChange}
                    placeholder="Date of Birth"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Aadhaar */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Aadhaar
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    name="aadhar"
                    maxLength={12}
                    value={formData.aadhar || ""}
                    onChange={handleChange}
                    placeholder="Aadhaar Number"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-12 items-start gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400 pt-1.5">
                  Address
                </label>
                <div className="col-span-8">
                  <textarea
                    name="address"
                    rows={2}
                    value={formData.description && formData.description.startsWith("[Address: ") ? formData.description.slice(10, -1) : ""}
                    onChange={(e) => {
                      const addr = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        description: addr ? `[Address: ${addr}]` : prev.description
                      }));
                    }}
                    placeholder="Start typing here..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-3.5">
              {/* Name */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Name <span className="text-rose-500">*</span>
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Father's Name */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Father&apos;s Name
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName || ""}
                    onChange={handleChange}
                    placeholder="Father Name"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* State */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  State
                </label>
                <div className="col-span-8">
                  <select
                    name="state"
                    value={formData.state || ""}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* City */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  City
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    name="city"
                    value={formData.city || ""}
                    onChange={handleChange}
                    placeholder="City"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* PAN Number */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  PAN Number
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    name="pan"
                    maxLength={10}
                    value={formData.pan || ""}
                    onChange={handleChange}
                    placeholder="Pancard Number"
                    className="w-full h-8 px-2.5 text-xs uppercase rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* GSTIN */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  GSTIN
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    name="gstin"
                    maxLength={15}
                    value={formData.gstin || ""}
                    onChange={handleChange}
                    placeholder="GST Number"
                    className="w-full h-8 px-2.5 text-xs uppercase rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Occupation */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Occupation
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation || ""}
                    onChange={handleChange}
                    placeholder="Occupation"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Investment Details */}
        <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] overflow-hidden">
          <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.08] text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Investment Details</span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Portfolio & financial profile</span>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-3.5">
            {/* LEFT COLUMN */}
            <div className="space-y-3.5">
              {/* Segment */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Segment
                </label>
                <div className="col-span-8">
                  <select
                    name="segment"
                    value={formData.segment || ""}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Segment</option>
                    <option value="Equity Cash">Equity Cash</option>
                    <option value="Options (F&O)">Options (F&O)</option>
                    <option value="Futures (F&O)">Futures (F&O)</option>
                    <option value="Commodity">Commodity</option>
                    <option value="Currency / Forex">Currency / Forex</option>
                    <option value="Multiple Segments">Multiple Segments</option>
                  </select>
                </div>
              </div>

              {/* Profile */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Profile
                </label>
                <div className="col-span-8">
                  <select
                    name="profile"
                    value={formData.profile || ""}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Profile</option>
                    {LEAD_PROFILE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lead Response */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Lead Response
                </label>
                <div className="col-span-8">
                  <select
                    name="leadResponse"
                    value={formData.leadResponse || ""}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Response</option>
                    {LEAD_RESPONSE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lead Source */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Lead Source
                </label>
                <div className="col-span-8">
                  <select
                    name="leadSource"
                    value={formData.leadSource || "Premium Lead"}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {LEAD_SOURCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="grid grid-cols-12 items-start gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400 pt-1.5">
                  Description
                </label>
                <div className="col-span-8">
                  <textarea
                    name="description"
                    rows={2}
                    value={formData.description || ""}
                    onChange={handleChange}
                    placeholder="Start typing here..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-3.5">
              {/* Investment */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Investment
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    name="investment"
                    value={formData.investment || ""}
                    onChange={handleChange}
                    placeholder="Investment"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Experience */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Experience
                </label>
                <div className="col-span-8">
                  <select
                    name="experience"
                    value={formData.experience || ""}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select</option>
                    {LEAD_EXPERIENCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lead Status */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Lead Status
                </label>
                <div className="col-span-8">
                  <select
                    name="status"
                    value={formData.status || "UNFOLLOWED"}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="UNFOLLOWED">Select Status</option>
                    <option value="UNFOLLOWED">Unfollowed</option>
                    <option value="UNREAD">Unread</option>
                    <option value="READ">Read</option>
                    <option value="FOLLOW_UP">Followups</option>
                    <option value="TRIAL">Trials</option>
                    <option value="CLIENT">Clients</option>
                    <option value="DISPOSED">Disposed</option>
                  </select>
                </div>
              </div>

              {/* Call Back Date */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-xs font-normal text-slate-600 dark:text-slate-400">
                  Call Back Date
                </label>
                <div className="col-span-8">
                  <input
                    type="date"
                    name="callbackDate"
                    value={formData.callbackDate ? formData.callbackDate.split("T")[0] : ""}
                    onChange={handleChange}
                    placeholder="Pick a date"
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
          <Link
            href="/admin/leads"
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isPending || !!phoneDuplicateError}
            className="inline-flex items-center gap-2 px-6 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-md shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving Lead...</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Save Lead</span>
              </>
            )}
          </button>
        </div>

        {/* Floating Action Button */}
        <button
          type="submit"
          disabled={isPending || !!phoneDuplicateError}
          className="fixed bottom-6 right-6 size-12 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-xl shadow-violet-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Save Lead"
        >
          {isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Settings className="size-5" />
          )}
        </button>
      </form>
    </div>
  );
}
