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
  Lock,
  Database,
  Layers,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Field,
  Input,
  Textarea,
  useToast,
} from "@/src/components/ui";

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
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await updateSystemSettingsAction({
        companyName,
        supportEmail,
        announcementBanner,
        timezone,
      });

      if (!res.success) {
        toast.error("Save failed", res.error ?? "Failed to save settings.");
        setIsLoading(false);
        return;
      }

      toast.success("Settings updated", "Changes applied across all dashboards.");
    } catch {
      toast.error("Network error", "An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title="System Settings & Preferences"
        description="Configure organization identity, employee support contacts, and system broadcast messages."
      />

      {/* SECTION 1: Configurable Settings Form */}
      <Card className="p-6 sm:p-7">
        <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-5">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Building className="size-4.5 text-brand" />
              <span>Organization & CRM Preferences</span>
            </h2>
            <span className="text-[11px] text-muted-foreground">
              Actively persisted in the database and applied across Manager and Employee views
            </span>
          </div>

          <Badge tone="ok" dot>
            Database Active
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Company Name */}
          <Field
            label="Company / Organization Name"
            required
            description="Displayed on headers, brand cards, and system reports."
          >
            <Input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Stock Emphasis Financial Services"
            />
          </Field>

          {/* Support Email */}
          <Field
            label="Support & Administrator Contact Email"
            required
            description="Displayed to unassigned employees and warehouse staff needing allocation."
          >
            <Input
              type="email"
              required
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="admin@stockemphasis.com"
            />
          </Field>

          {/* Announcement Banner */}
          <Field
            label="System Announcement Banner"
            description="Broadcasted as a prominent notice banner to all Manager and Employee dashboards. Leave blank to disable."
          >
            <Textarea
              rows={2}
              placeholder="e.g. Scheduled warehouse inventory audit this Friday starting 09:00 AM."
              value={announcementBanner}
              onChange={(e) => setAnnouncementBanner(e.target.value)}
            />
          </Field>

          {/* Timezone Preference */}
          <Field
            label="Operational Timezone Display"
            description="Default timestamp reference used across reports and audit tables."
          >
            <Input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Asia/Kolkata"
            />
          </Field>

          {/* Submit Button */}
          <div className="pt-3 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
            >
              Save CRM Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* SECTION 2: Engine Architecture & Security Parameters (Honest Read-Only Display) */}
      <Card className="p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4.5 text-brand" />
              <span>Core System Architecture & Security Parameters</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Engine-level security parameters enforced at the framework and database level.
            </p>
          </div>

          <Badge tone="info">
            Read-Only Specs
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-brand" />
              <span className="text-foreground font-medium">Session Strategy</span>
            </div>
            <span className="font-mono text-brand font-semibold text-[11px]">
              NextAuth v5 JWT (Stateless)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-foreground font-medium">Password Hashing</span>
            </div>
            <span className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
              Bcryptjs (10 Salt Rounds)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-sky-600 dark:text-sky-400" />
              <span className="text-foreground font-medium">Database Engine</span>
            </div>
            <span className="font-mono text-sky-700 dark:text-sky-300 font-semibold text-[11px]">
              PostgreSQL 18 + Prisma Client
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-foreground font-medium">Role Privilege Isolation</span>
            </div>
            <span className="font-mono text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
              ADMIN • MANAGER • EMPLOYEE
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground font-semibold">Note on Security Governance:</strong>{" "}
          Engine-level parameters like cryptographic hashing and stateless JWT validation are enforced in core code
          to ensure maximum system stability and prevent accidental administrative misconfigurations.
        </div>
      </Card>
    </div>
  );
}
