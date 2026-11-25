"use client";

import { useState } from "react";
import { createLeadSourceAction, updateLeadSourceAction } from "./actions";
import type { LeadSourceItem } from "./types";
import { Modal, Field, Input, Textarea, Button } from "@/src/components/ui";

interface LeadSourceModalProps {
  source: LeadSourceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedSource: LeadSourceItem) => void;
}

export function LeadSourceModal({
  source,
  isOpen,
  onClose,
  onSuccess,
}: LeadSourceModalProps) {
  const isEditing = Boolean(source);

  const [name, setName] = useState(source?.name || "");
  const [description, setDescription] = useState(source?.description || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && source) {
        const res = await updateLeadSourceAction({
          id: source.id,
          name: trimmedName,
          description: description.trim() || undefined,
        });

        if (!res.success || !res.leadSource) {
          setErrorMsg(res.error || "Failed to update lead source.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.leadSource);
        onClose();
      } else {
        const res = await createLeadSourceAction({
          name: trimmedName,
          description: description.trim() || undefined,
        });

        if (!res.success || !res.leadSource) {
          setErrorMsg(res.error || "Failed to create lead source.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.leadSource);
        onClose();
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
      title={isEditing ? "Edit Lead Source" : "Add Lead Source"}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmit}
          >
            Save
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Name Field */}
        <Field label="Name" required>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
        </Field>

        {/* Description Field */}
        <Field label="Description">
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Start typing here..."
          />
        </Field>
      </form>
    </Modal>
  );
}

