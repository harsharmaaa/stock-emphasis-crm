"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Shield, Bold, Italic, List, ListOrdered } from "lucide-react";
import { INDIAN_STATES } from "@/src/features/users/employee-form";
import { updateCompanyDetailsAction } from "./actions";
import type { CompanyDetailsValues } from "./types";
import {
  PageHeader,
  Card,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  useToast,
} from "@/src/components/ui";

// Days 01 through 31
const MONTH_START_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const day = String(i + 1).padStart(2, "0");
  return day;
});

// Month end options: "Last Day Of Month", followed by 01 to 31
const MONTH_END_OPTIONS = [
  "Last Day Of Month",
  ...Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")),
];

interface CompanyClientProps {
  initialData: CompanyDetailsValues;
}

export function CompanyClient({ initialData }: CompanyClientProps) {
  const [name, setName] = useState(initialData.name);
  const [website, setWebsite] = useState(initialData.website);
  const [state, setState] = useState(initialData.state);
  const [city, setCity] = useState(initialData.city);
  const [address, setAddress] = useState(initialData.address);
  const [monthStartDay, setMonthStartDay] = useState(initialData.monthStartDay || "01");
  const [monthEndDay, setMonthEndDay] = useState(initialData.monthEndDay || "Last Day Of Month");
  const [policy, setPolicy] = useState(initialData.policy);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  // Helper formatting for policy editor
  const applyFormat = (syntaxPrefix: string, syntaxSuffix: string = "") => {
    const textarea = document.getElementById("policy-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    const replacement = `${syntaxPrefix}${selectedText || "text"}${syntaxSuffix}`;
    const newPolicy = `${beforeText}${replacement}${afterText}`;
    setPolicy(newPolicy);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + syntaxPrefix.length, start + replacement.length - syntaxSuffix.length);
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Validation error", "Company Name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updateCompanyDetailsAction({
        name,
        website,
        state,
        city,
        address,
        monthStartDay,
        monthEndDay,
        policy,
      });

      if (res.success) {
        toast.success("Saved successfully", "Company details and policy saved successfully.");
      } else {
        toast.error("Save failed", res.error || "Failed to save company details.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="COMPANY"
        description="Configure official corporate details, business calendar cycles, and company policy."
        actions={
          <Link href="/admin/settings/configuration">
            <Button variant="danger" size="sm">
              <ArrowLeft className="size-3.5" />
              Go Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section A: Details Card */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-border/70 bg-muted/20 flex items-center gap-2">
            <Building2 className="size-4 text-brand" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Details
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {/* Row 1 Left: Name */}
              <Field label="Name" required>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. STOCK EMPHASIS"
                />
              </Field>

              {/* Row 1 Right: Website */}
              <Field label="Website">
                <Input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. www.stockemphasis.com"
                />
              </Field>

              {/* Row 2 Left: State */}
              <Field label="State">
                <Select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Row 2 Right: City */}
              <Field label="City">
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Indore"
                />
              </Field>

              {/* Row 3 Left: Address */}
              <Field label="Address">
                <Textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="25, FA, Scheme No. 94, Sector-F, 201-202, Lake View-1, Indore (M.P.)"
                />
              </Field>

              {/* Row 3 Right: Month Start Day */}
              <Field label="Month Start Day">
                <Select
                  value={monthStartDay}
                  onChange={(e) => setMonthStartDay(e.target.value)}
                >
                  {MONTH_START_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Row 4 Left: Month End Day */}
              <Field label="Month End Day">
                <Select
                  value={monthEndDay}
                  onChange={(e) => setMonthEndDay(e.target.value)}
                >
                  {MONTH_END_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        {/* Section B: Policy Card */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-border/70 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-emerald-500" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Policy
              </h2>
            </div>

            {/* Quick format tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyFormat("**", "**")}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-xs"
                title="Bold (**text**)"
              >
                <Bold className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("*", "*")}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-xs"
                title="Italic (*text*)"
              >
                <Italic className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("\n- ")}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-xs"
                title="Bullet List (- item)"
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("\n1. ")}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-xs"
                title="Numbered List (1. item)"
              >
                <ListOrdered className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <Textarea
              id="policy-textarea"
              rows={8}
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              placeholder="Start typing here..."
              className="font-mono"
            />
          </div>
        </Card>

        {/* Submit Save Button */}
        <div className="flex justify-center pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="px-8"
          >
            Save
          </Button>
        </div>

        {/* Footer info matching screenshot */}
        <div className="pt-6 text-center text-[11px] text-muted-foreground border-t border-border/70">
          © Stock Emphasis v4.2.0. All rights reserved.
        </div>
      </form>
    </div>
  );
}

