"use client";

import { useState } from "react";
import type { SystemSettingsValues } from "./actions";
import { updateSystemSettingsAction } from "./actions";
import {
  Settings,
  Building,
  Mail,
  Megaphone,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Database,
  Layers,
} from "lucide-react";

interface SettingsClientProps {
  initialSettings: SystemSettingsValues;
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [companyName, setCompanyName] = useState(initialSettings.companyName);
  const [supportEmail, setSupportEmail] = useState(initialSettings.supportEmail);
  const [announcementBanner, setAnnouncementBanner] = useState(
    initialSettings.announcementBanner
  );
  const [timezone, setTimezone] = useState(initialSettings.timezone);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await updateSystemSettingsAction({
        companyName,
        supportEmail,
        announcementBanner,
        timezone,
      });

      if (!res.success) {
        setErrorMessage(res.error ?? "Failed to save settings.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Settings updated successfully! Changes applied across all dashboards.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setErrorMessage("An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Settings className="size-6 text-violet-600 dark:text-violet-400" />
          <span>System Settings & Preferences</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure organization identity, employee support contacts, and system broadcast messages.
        </p>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="size-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-500 dark:text-emerald-400 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* SECTION 1: Configurable Settings Form */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08] mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="size-4.5 text-violet-600 dark:text-violet-400" />
              <span>Organization & CRM Preferences</span>
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Actively persisted in the database and applied across Manager and Employee views
            </span>
          </div>

          <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Database Active
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Company Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building className="size-3.5 text-slate-400" />
              <span>Company / Organization Name</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Displayed on headers, brand cards, and system reports.
            </span>
          </div>

          {/* Support Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="size-3.5 text-slate-400" />
              <span>Support & Administrator Contact Email</span>
            </label>
            <input
              type="email"
              required
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Displayed to unassigned employees and warehouse staff needing allocation.
            </span>
          </div>

          {/* Announcement Banner */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Megaphone className="size-3.5 text-slate-400" />
              <span>System Announcement Banner</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Scheduled warehouse inventory audit this Friday starting 09:00 AM."
              value={announcementBanner}
              onChange={(e) => setAnnouncementBanner(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50/70 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Broadcasted as a prominent notice banner to all Manager and Employee dashboards. Leave blank to disable.
            </span>
          </div>

          {/* Timezone Preference */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="size-3.5 text-slate-400" />
              <span>Operational Timezone Display</span>
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Default timestamp reference used across reports and audit tables.
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save CRM Preferences</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Engine Architecture & Security Parameters (Honest Read-Only Display) */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white/60 dark:bg-[#0c1322]/50 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="size-4.5 text-blue-500 dark:text-blue-400" />
              <span>Core System Architecture & Security Parameters</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Engine-level security parameters enforced at the framework and database level.
            </p>
          </div>

          <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]">
            Read-Only Specs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-violet-600 dark:text-violet-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Session Strategy</span>
            </div>
            <span className="font-mono text-violet-700 dark:text-violet-300 font-semibold text-[11px]">
              NextAuth v5 JWT (Stateless)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Password Hashing</span>
            </div>
            <span className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
              Bcryptjs (10 Salt Rounds)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Database Engine</span>
            </div>
            <span className="font-mono text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
              PostgreSQL 18 + Prisma Client
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Role Privilege Isolation</span>
            </div>
            <span className="font-mono text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
              ADMIN • MANAGER • EMPLOYEE
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.05] text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong className="text-slate-700 dark:text-slate-300 font-semibold">Note on Security Governance:</strong>{" "}
          Engine-level parameters like cryptographic hashing and stateless JWT validation are enforced in core code
          to ensure maximum system stability and prevent accidental administrative misconfigurations.
        </div>
      </div>
    </div>
  );
}
