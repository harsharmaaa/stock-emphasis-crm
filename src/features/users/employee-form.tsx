"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Building2,
  UserCheck2,
  Users2,
  Briefcase,
  Target,
  FileText,
  ShieldCheck,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import type { Role } from "@prisma/client";
import type {
  DepartmentOption,
  ProfileOption,
  ManagerOption,
  SafeUser,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "./actions";
import { createUserAction, updateUserAction } from "./actions";

export const INDIAN_STATES = [
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
  "Jammu and Kashmir",
  "Ladakh",
  "Chandigarh",
] as const;

export const PAST_EXPERIENCE_OPTIONS = [
  "Not Started",
  "Fresher",
  "Less than 1 Year",
  "1-2 Years",
  "2-3 Years",
  "3-5 Years",
  "5+ Years",
] as const;

interface EmployeeFormProps {
  mode: "create" | "edit";
  initialUser?: SafeUser;
  departments: DepartmentOption[];
  profiles: ProfileOption[];
  managers: ManagerOption[];
  leadSources: readonly string[];
  onSuccess?: () => void;
}

export function EmployeeForm({
  mode,
  initialUser,
  departments,
  profiles,
  managers,
  leadSources,
  onSuccess,
}: EmployeeFormProps) {
  const router = useRouter();

  // Basic Details State
  const [name, setName] = useState(initialUser?.name || "");
  const [mobile, setMobile] = useState(initialUser?.mobile || "");
  const [fatherName, setFatherName] = useState(initialUser?.fatherName || "");
  const [email, setEmail] = useState(initialUser?.email || "");
  const [state, setState] = useState(initialUser?.state || "");
  const [city, setCity] = useState(initialUser?.city || "");
  const [dob, setDob] = useState(initialUser?.dob || "");
  const [address, setAddress] = useState(initialUser?.address || "");

  // Other Details State
  const [isActive, setIsActive] = useState<boolean>(initialUser ? initialUser.isActive : true);
  const [username, setUsername] = useState(initialUser?.username || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>(initialUser?.role || "EMPLOYEE");
  const [departmentId, setDepartmentId] = useState(initialUser?.departmentId || "");
  const [employeeProfileId, setEmployeeProfileId] = useState(initialUser?.employeeProfileId || "");
  const [joiningDate, setJoiningDate] = useState(initialUser?.joiningDate || "");
  const [pastExperience, setPastExperience] = useState(initialUser?.pastExperience || "Not Started");
  const [callingExtension, setCallingExtension] = useState(initialUser?.callingExtension || "");
  const [description, setDescription] = useState(initialUser?.description || "");
  const [managerId, setManagerId] = useState(initialUser?.managerId || "");
  const [employeeTarget, setEmployeeTarget] = useState<string>(
    initialUser?.employeeTarget !== null && initialUser?.employeeTarget !== undefined
      ? String(initialUser.employeeTarget)
      : "0"
  );

  // Lead Fetch Permission State
  const [selectedLeadSources, setSelectedLeadSources] = useState<string[]>(
    initialUser?.leadFetchSources || []
  );

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter profiles dynamically based on selected Department
  const filteredProfiles = useMemo(() => {
    if (!departmentId) return [];
    return profiles.filter((p) => p.departmentId === departmentId);
  }, [departmentId, profiles]);

  // Handle department change: clear profile if it no longer belongs to new department
  const handleDepartmentChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    if (!newDeptId) {
      setEmployeeProfileId("");
      return;
    }
    const currentProfile = profiles.find((p) => p.id === employeeProfileId);
    if (currentProfile && currentProfile.departmentId !== newDeptId) {
      setEmployeeProfileId("");
    }
  };

  // Lead Fetch Permission toggles
  const handleToggleLeadSource = (source: string) => {
    setSelectedLeadSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleSelectAllSources = () => {
    setSelectedLeadSources([...leadSources]);
  };

  const handleClearAllSources = () => {
    setSelectedLeadSources([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg("Employee Name is required.");
      return;
    }

    if (!username.trim()) {
      setErrorMsg("Username is required.");
      return;
    }

    if (!email.trim()) {
      setErrorMsg("Email address is required.");
      return;
    }

    if (mode === "create" && (!password.trim() || password.length < 6)) {
      setErrorMsg("Password is required and must be at least 6 characters.");
      return;
    }

    if (mode === "edit" && password.trim() && password.trim().length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "create") {
        const input: CreateEmployeeInput = {
          name: name.trim(),
          mobile: mobile.trim() || undefined,
          fatherName: fatherName.trim() || undefined,
          email: email.trim().toLowerCase(),
          state: state || undefined,
          city: city.trim() || undefined,
          dob: dob || undefined,
          address: address.trim() || undefined,
          isActive,
          username: username.trim(),
          password: password.trim(),
          role,
          departmentId: departmentId || undefined,
          employeeProfileId: employeeProfileId || undefined,
          joiningDate: joiningDate || undefined,
          pastExperience: pastExperience || undefined,
          callingExtension: callingExtension.trim() || undefined,
          description: description.trim() || undefined,
          managerId: managerId || undefined,
          employeeTarget: Number(employeeTarget) || 0,
          leadFetchSources: selectedLeadSources,
        };

        const res = await createUserAction(input);
        if (!res.success) {
          setErrorMsg(res.error || "Failed to create employee.");
          setIsSubmitting(false);
          return;
        }

        setSuccessMsg(`Employee "${res.user?.name}" created successfully!`);
        if (onSuccess) {
          onSuccess();
        } else {
          setTimeout(() => router.push("/admin/users"), 700);
        }
      } else {
        if (!initialUser) return;

        const input: UpdateEmployeeInput = {
          userId: initialUser.id,
          name: name.trim(),
          mobile: mobile.trim() || undefined,
          fatherName: fatherName.trim() || undefined,
          email: email.trim().toLowerCase(),
          state: state || undefined,
          city: city.trim() || undefined,
          dob: dob || undefined,
          address: address.trim() || undefined,
          isActive,
          username: username.trim(),
          newPassword: password.trim() || undefined,
          role,
          departmentId: departmentId || undefined,
          employeeProfileId: employeeProfileId || undefined,
          joiningDate: joiningDate || undefined,
          pastExperience: pastExperience || undefined,
          callingExtension: callingExtension.trim() || undefined,
          description: description.trim() || undefined,
          managerId: managerId || undefined,
          employeeTarget: Number(employeeTarget) || 0,
          leadFetchSources: selectedLeadSources,
        };

        const res = await updateUserAction(input);
        if (!res.success) {
          setErrorMsg(res.error || "Failed to update employee.");
          setIsSubmitting(false);
          return;
        }

        setSuccessMsg(`Employee "${res.user?.name}" updated successfully!`);
        if (onSuccess) {
          onSuccess();
        } else {
          setTimeout(() => router.push("/admin/users"), 700);
        }
      }
    } catch {
      setErrorMsg("An unexpected network or server error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              Employee Directory
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>{mode === "create" ? "ADD EMPLOYEE" : "EDIT EMPLOYEE"}</span>
          </h1>
        </div>

        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all"
        >
          <ChevronLeft className="size-3.5" />
          Go Back
        </Link>
      </div>

      {/* Error / Success Banners */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION A: BASIC DETAILS                                      */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <User className="size-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Basic Details</h2>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mobile Number
            </label>
            <input
              type="tel"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Father's Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Father&apos;s Name
            </label>
            <input
              type="text"
              placeholder="Father's Name"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              placeholder="employee@stockemphasis.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              City
            </label>
            <input
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Address
            </label>
            <textarea
              rows={2}
              placeholder="Start typing residential address here..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION B: OTHER DETAILS                                      */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Briefcase className="size-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Other Details</h2>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status</span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((prev) => !prev)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-[11px] font-semibold ${
                isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Username <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. harsh"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {mode === "create" ? (
                <>Password <span className="text-rose-500">*</span></>
              ) : (
                <>New Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span></>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={mode === "create" ? "emp@123" : "Enter new password if resetting"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={mode === "create"}
                className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Profile (Filtered by selected Department!) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Profile / Designation <span className="text-rose-500">*</span>
            </label>
            <select
              value={employeeProfileId}
              onChange={(e) => setEmployeeProfileId(e.target.value)}
              disabled={!departmentId}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">
                {departmentId ? "Select Profile" : "Please select department first"}
              </option>
              {filteredProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {!departmentId && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                Select a Department first to view its active profiles.
              </p>
            )}
          </div>

          {/* Past Experience */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Past Experience
            </label>
            <select
              value={pastExperience}
              onChange={(e) => setPastExperience(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {PAST_EXPERIENCE_OPTIONS.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          </div>

          {/* Joining Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Joining Date
            </label>
            <input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Calling Extension */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Calling Extension
            </label>
            <input
              type="text"
              placeholder="e.g. 2023"
              value={callingExtension}
              onChange={(e) => setCallingExtension(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Reporting Manager */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reporting Manager
            </label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">No Reporting Manager</option>
              {managers
                .filter((m) => mode === "create" || m.id !== initialUser?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.profileName ? `(${m.profileName})` : ""}
                  </option>
                ))}
            </select>
          </div>

          {/* Employee Target */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Employee Target (₹)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="e.g. 135000"
              value={employeeTarget}
              onChange={(e) => setEmployeeTarget(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* System Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              System Access Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="EMPLOYEE">EMPLOYEE (Standard Staff)</option>
              <option value="MANAGER">MANAGER (Team Lead / Oversight)</option>
              <option value="ADMIN">ADMIN (Full Governance)</option>
            </select>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Start typing employee notes, qualifications or designations here..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-white/[0.1] bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION C: LEAD FETCH PERMISSION (CRITICAL REQUIREMENT)        */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Lead Fetch Permission</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure authorized lead sources this employee can fetch leads from.
              </p>
            </div>
          </div>

          {employeeProfileId && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleSelectAllSources}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAllSources}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {!employeeProfileId ? (
            /* Empty state when no profile is selected */
            <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-250 dark:border-white/[0.08] rounded-xl">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Please Select Profile
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Select a Department and Profile above to unlock lead source fetch permissions.
              </p>
            </div>
          ) : (
            /* Checkbox list when profile is selected */
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {leadSources.map((source) => {
                  const isChecked = selectedLeadSources.includes(source);
                  return (
                    <label
                      key={source}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all select-none ${
                        isChecked
                          ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 shadow-2xs"
                          : "bg-slate-50/40 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleLeadSource(source)}
                        className="size-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500/20"
                      />
                      <span className="truncate">{source}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {selectedLeadSources.length} of {leadSources.length} source(s) permitted
                </span>
                {selectedLeadSources.length === 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    Warning: Empty permission list means this employee cannot fetch leads.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit / Cancel Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/admin/users"
          className="px-5 py-2.5 rounded-xl border border-slate-250 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="size-4" />
              <span>{mode === "create" ? "Save Employee" : "Update Employee"}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

