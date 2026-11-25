"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Briefcase,
  ShieldCheck,
  Eye,
  EyeOff,
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
import {
  PageHeader,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  DatePicker,
  Button,
  Badge,
  useToast,
} from "@/src/components/ui";

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
  const toast = useToast();

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

    if (!name.trim()) {
      setErrorMsg("Employee Name is required.");
      toast.error("Validation Error", "Employee Name is required.");
      return;
    }

    if (!username.trim()) {
      setErrorMsg("Username is required.");
      toast.error("Validation Error", "Username is required.");
      return;
    }

    if (!email.trim()) {
      setErrorMsg("Email address is required.");
      toast.error("Validation Error", "Email address is required.");
      return;
    }

    if (mode === "create" && (!password.trim() || password.length < 6)) {
      setErrorMsg("Password is required and must be at least 6 characters.");
      toast.error("Validation Error", "Password must be at least 6 characters.");
      return;
    }

    if (mode === "edit" && password.trim() && password.trim().length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      toast.error("Validation Error", "New password must be at least 6 characters.");
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
          toast.error("Creation Failed", res.error || "Failed to create employee.");
          setIsSubmitting(false);
          return;
        }

        toast.success(
          "Employee Created",
          `Employee "${res.user?.name}" was created successfully!`
        );
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
          toast.error("Update Failed", res.error || "Failed to update employee.");
          setIsSubmitting(false);
          return;
        }

        toast.success(
          "Employee Updated",
          `Employee "${res.user?.name}" was updated successfully!`
        );
        if (onSuccess) {
          onSuccess();
        } else {
          setTimeout(() => router.push("/admin/users"), 700);
        }
      }
    } catch {
      setErrorMsg("An unexpected network or server error occurred.");
      toast.error("Error", "An unexpected network or server error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <PageHeader
        title={mode === "create" ? "Add Employee" : "Edit Employee"}
        description={
          mode === "create"
            ? "Create a new CRM employee with profile designation and lead fetch permissions."
            : `Update details, designation, credentials, and lead fetch permissions for ${initialUser?.name || "employee"}.`
        }
        breadcrumbs={[
          { label: "Employees", href: "/admin/users" },
          { label: mode === "create" ? "Add Employee" : "Edit" },
        ]}
        actions={
          <Link href="/admin/users">
            <Button variant="sec" size="sm" leftIcon="ChevronLeft">
              Back to Directory
            </Button>
          </Link>
        }
      />

      {/* Global Error Banner if needed */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-[var(--err)]/10 border border-[var(--err)]/30 flex items-center gap-2.5 text-xs text-[var(--err)] font-medium"
        >
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION A: BASIC DETAILS                                      */}
      {/* ============================================================== */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-[var(--brand-soft)]/20 text-[var(--brand)] flex items-center justify-center">
            <User className="size-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Basic Details</h2>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Name */}
          <Field label="Full Name" required error={!name.trim() && errorMsg ? "Name is required" : undefined}>
            <Input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          {/* Mobile */}
          <Field label="Mobile Number">
            <Input
              type="tel"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </Field>

          {/* Father's Name */}
          <Field label="Father's Name">
            <Input
              type="text"
              placeholder="Father's Name"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
            />
          </Field>

          {/* Email */}
          <Field label="Email Address" required error={!email.trim() && errorMsg ? "Email is required" : undefined}>
            <Input
              type="email"
              placeholder="employee@stockemphasis.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          {/* State */}
          <Field label="State">
            <Select
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          {/* City */}
          <Field label="City">
            <Input
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </Field>

          {/* Date of Birth */}
          <Field label="Date of Birth">
            <DatePicker
              value={dob}
              onChange={setDob}
              placeholder="Select date of birth"
            />
          </Field>

          {/* Address */}
          <div className="md:col-span-2">
            <Field label="Residential Address">
              <Textarea
                rows={2}
                placeholder="Start typing residential address here..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* ============================================================== */}
      {/* SECTION B: OTHER DETAILS                                      */}
      {/* ============================================================== */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-[var(--brand-soft)]/20 text-[var(--brand)] flex items-center justify-center">
              <Briefcase className="size-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Profile & Credentials</h2>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Account Status</span>
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
            <Badge tone={isActive ? "ok" : "warn"} dot>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Username */}
          <Field label="Username" required error={!username.trim() && errorMsg ? "Username is required" : undefined}>
            <Input
              type="text"
              placeholder="e.g. rahul.sharma"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Field>

          {/* Password */}
          <Field
            label={mode === "create" ? "Password" : "New Password"}
            required={mode === "create"}
            description={mode === "edit" ? "Leave blank to keep current password unchanged." : undefined}
          >
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={mode === "create" ? "At least 6 characters" : "Enter new password if resetting"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={mode === "create"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </Field>

          {/* Department */}
          <Field label="Department">
            <Select
              value={departmentId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>

          {/* Employee Profile (Filtered by selected Department!) */}
          <Field
            label="Designation / Profile"
            required
            description={!departmentId ? "Select a Department first to view available profiles." : undefined}
          >
            <Select
              value={employeeProfileId}
              onChange={(e) => setEmployeeProfileId(e.target.value)}
              disabled={!departmentId}
              required
            >
              <option value="">
                {departmentId ? "Select Designation / Profile" : "Please select department first"}
              </option>
              {filteredProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          {/* Past Experience */}
          <Field label="Past Experience">
            <Select
              value={pastExperience}
              onChange={(e) => setPastExperience(e.target.value)}
            >
              {PAST_EXPERIENCE_OPTIONS.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </Select>
          </Field>

          {/* Joining Date */}
          <Field label="Joining Date">
            <DatePicker
              value={joiningDate}
              onChange={setJoiningDate}
              placeholder="Select joining date"
            />
          </Field>

          {/* Calling Extension */}
          <Field label="Calling Extension">
            <Input
              type="text"
              placeholder="e.g. 2023"
              value={callingExtension}
              onChange={(e) => setCallingExtension(e.target.value)}
            />
          </Field>

          {/* Reporting Manager */}
          <Field label="Reporting Manager">
            <Select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
            >
              <option value="">No Reporting Manager (Direct Report)</option>
              {managers
                .filter((m) => mode === "create" || m.id !== initialUser?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.profileName ? `(${m.profileName})` : ""}
                  </option>
                ))}
            </Select>
          </Field>

          {/* Employee Target */}
          <Field label="Monthly Target (₹)">
            <Input
              type="number"
              min="0"
              step="1000"
              placeholder="e.g. 135000"
              value={employeeTarget}
              onChange={(e) => setEmployeeTarget(e.target.value)}
            />
          </Field>

          {/* System Role */}
          <Field label="System Access Role">
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="EMPLOYEE">EMPLOYEE (Standard Staff)</option>
              <option value="MANAGER">MANAGER (Team Lead / Oversight)</option>
              <option value="ADMIN">ADMIN (Full Governance)</option>
            </Select>
          </Field>

          {/* Description */}
          <div className="md:col-span-2">
            <Field label="Description / Notes">
              <Textarea
                rows={2}
                placeholder="Start typing employee notes, qualifications or designations here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* ============================================================== */}
      {/* SECTION C: LEAD FETCH PERMISSION                               */}
      {/* ============================================================== */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-[var(--brand-soft)]/20 text-[var(--brand)] flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Lead Fetch Permission</h2>
                <Badge tone={selectedLeadSources.length > 0 ? "ok" : "warn"}>
                  {selectedLeadSources.length} of {leadSources.length} Permitted
                </Badge>
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Configure authorized lead sources this employee can fetch leads from.
              </p>
            </div>
          </div>

          {employeeProfileId && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button type="button" variant="sec" size="sm" onClick={handleSelectAllSources}>
                Select All
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearAllSources}>
                Clear All
              </Button>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {!employeeProfileId ? (
            <div className="py-8 text-center bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-250 dark:border-white/[0.08] rounded-xl">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Please Select Department & Profile
              </p>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Select a Department and Profile above to unlock lead source fetch permissions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {leadSources.map((source) => {
                  const isChecked = selectedLeadSources.includes(source);
                  return (
                    <label
                      key={source}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all select-none ${
                        isChecked
                          ? "bg-[var(--brand-soft)]/15 border-[var(--brand)]/40 text-[var(--text)] shadow-2xs"
                          : "bg-slate-50/40 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.06] text-[var(--muted)] hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleLeadSource(source)}
                        className="size-4 rounded-md border-slate-300 text-[var(--brand)] focus:ring-[var(--brand)]/20 cursor-pointer"
                      />
                      <span className="truncate">{source}</span>
                    </label>
                  );
                })}
              </div>

              {selectedLeadSources.length === 0 && (
                <p className="text-[11px] text-[var(--warn)] pt-1">
                  Warning: Empty permission list means this employee cannot fetch leads.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Submit / Cancel Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/admin/users">
          <Button variant="sec" size="md">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSubmitting}
          leftIcon="Check"
        >
          {mode === "create" ? "Save Employee" : "Update Employee"}
        </Button>
      </div>
    </form>
  );
}
