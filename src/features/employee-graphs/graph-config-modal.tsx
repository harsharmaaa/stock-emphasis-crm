"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  saveEmployeeGraphConfigAction,
  type EmployeeGraphConfigItem,
  type ProfileOption,
  type GraphType,
} from "./actions";
import { Modal, Field, Input, Select, Button } from "@/src/components/ui";

interface GraphConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (item: EmployeeGraphConfigItem) => void;
  initialData?: EmployeeGraphConfigItem | null;
  profiles: ProfileOption[];
}

export function GraphConfigModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
  profiles,
}: GraphConfigModalProps) {
  const isKnown = initialData
    ? profiles.some((p) => p.name.toUpperCase() === initialData.profile.toUpperCase())
    : true;

  const [title, setTitle] = useState(initialData?.title || "");
  const [profile, setProfile] = useState(
    initialData ? (isKnown ? initialData.profile : "CUSTOM") : profiles[0]?.name || "TL"
  );
  const [customProfile, setCustomProfile] = useState(
    initialData && !isKnown ? initialData.profile : ""
  );
  const [size, setSize] = useState(initialData?.size || 5);
  const [type, setType] = useState<GraphType>(initialData?.type || "Individual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please provide a Title for the graph.");
      return;
    }
    const finalProfile = profile === "CUSTOM" ? customProfile.trim() : profile;
    if (!finalProfile) {
      setErrorMsg("Please select or enter a Profile.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await saveEmployeeGraphConfigAction({
        id: initialData?.id,
        title: title.trim(),
        profile: finalProfile,
        size: Number(size) || 5,
        type,
      });

      if (res.success && res.config) {
        onSaved(res.config);
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to save graph configuration.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Graph Configuration" : "Add Graph Configuration"}
      description="Configure leaderboard tier, profile cohort, and display size."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmit}
          >
            {initialData ? "Update Configuration" : "Create Configuration"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Title */}
        <Field label="Graph Title" required>
          <Input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Best TL, Top Best SBA"
          />
        </Field>

        {/* Profile Selector */}
        <Field label="Target Profile" required>
          <Select
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} {p.departmentName ? `(${p.departmentName})` : ""}
              </option>
            ))}
            <option value="CUSTOM">+ Custom Profile Name</option>
          </Select>
        </Field>

        {profile === "CUSTOM" && (
          <Field label="Custom Profile Identifier" required>
            <Input
              type="text"
              required
              value={customProfile}
              onChange={(e) => setCustomProfile(e.target.value)}
              placeholder="e.g. AFM, Executive, Specialist"
            />
          </Field>
        )}

        {/* Size (Top Count) */}
        <Field
          label="Display Size (Top Performers Count)"
          description="Number of top ranking operators or teams displayed on the bar graph."
        >
          <Input
            type="number"
            min={1}
            max={50}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </Field>

        {/* Type (Individual vs Team) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Graph Type
          </label>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              type="button"
              variant={type === "Individual" ? "primary" : "outline"}
              onClick={() => setType("Individual")}
              className="w-full"
            >
              Individual
            </Button>
            <Button
              type="button"
              variant={type === "Team" ? "primary" : "outline"}
              onClick={() => setType("Team")}
              className="w-full"
            >
              Team
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

