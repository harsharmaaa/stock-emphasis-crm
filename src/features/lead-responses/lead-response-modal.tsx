"use client";

import { useState } from "react";
import { createLeadResponseAction, updateLeadResponseAction } from "./actions";
import type { LeadResponseItem } from "./types";
import { Modal, Field, Input, Textarea, Button } from "@/src/components/ui";

interface LeadResponseModalProps {
  responseItem: LeadResponseItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saved: LeadResponseItem) => void;
}

export function LeadResponseModal({
  responseItem,
  isOpen,
  onClose,
  onSuccess,
}: LeadResponseModalProps) {
  const isEditing = Boolean(responseItem);

  const [name, setName] = useState(responseItem?.name || "");
  const [description, setDescription] = useState(responseItem?.description || "");
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
      if (isEditing && responseItem) {
        const res = await updateLeadResponseAction({
          id: responseItem.id,
          name: trimmedName,
          description: description.trim() || undefined,
        });

        if (!res.success || !res.leadResponse) {
          setErrorMsg(res.error || "Failed to update lead response.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.leadResponse);
        onClose();
      } else {
        const res = await createLeadResponseAction({
          name: trimmedName,
          description: description.trim() || undefined,
        });

        if (!res.success || !res.leadResponse) {
          setErrorMsg(res.error || "Failed to create lead response.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.leadResponse);
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
      title={isEditing ? "Edit Lead Response" : "Add Lead Response"}
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
            placeholder="e.g. Callback, Interested, FT, Busy"
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

