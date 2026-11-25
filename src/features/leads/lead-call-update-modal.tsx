"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Calendar,
  MessageSquare,
  Layers,
  Plus,
  Check,
} from "lucide-react";
import {
  updateLeadDetailsAction,
  getActiveLeadResponsesAction,
  type LeadListItem,
} from "./actions";
import {
  Modal,
  Button,
  Field,
  Select,
  Textarea,
  useToast,
} from "@/src/components/ui";

interface LeadCallUpdateModalProps {
  lead: LeadListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeadCallUpdateModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: LeadCallUpdateModalProps) {
  if (!isOpen || !lead) return null;

  return (
    <LeadCallUpdateModalContent
      key={lead.id}
      lead={lead}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function LeadCallUpdateModalContent({
  lead,
  onClose,
  onSuccess,
}: {
  lead: LeadListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [response, setResponse] = useState<string>(lead.leadResponse || "");
  const [activeResponses, setActiveResponses] = useState<string[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState<boolean>(true);
  const [callbackDate, setCallbackDate] = useState<string>(
    lead.callbackDate ? lead.callbackDate.slice(0, 16) : ""
  );
  const [comment, setComment] = useState<string>(lead.description || "");
  const [isFollowup, setIsFollowup] = useState<boolean>(lead.status === "FOLLOW_UP");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getActiveLeadResponsesAction().then((res) => {
      if (res.success && res.leadResponses) {
        setActiveResponses(res.leadResponses);
      }
      setIsLoadingResponses(false);
    });
  }, []);

  // Format display date: e.g. 26-Oct-26
  const displayDate = lead.createdAt
    ? new Date(lead.createdAt)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
        .replace(/ /g, "-")
    : "";

  const handleResponseChange = (newResp: string) => {
    setResponse(newResp);
    const upper = newResp.trim().toUpperCase();
    if (["FOLLOW UP", "FOLLOW_UP", "FOLLOWUP"].includes(upper)) {
      setIsFollowup(true);
    } else if (newResp) {
      // If user selected any other response, turn off followup
      setIsFollowup(false);
    }
  };

  const handleAddFollowupClick = () => {
    setIsFollowup((prev) => !prev);
  };

  const handleSave = () => {
    setErrorMessage(null);

    const normResp = (response || "").trim().toUpperCase();
    const isSpecialTerminal = ["FT", "FREE TRIAL", "TRIAL", "DISPOSED", "DISPOSE"].includes(normResp);
    const statusPayload = isFollowup && !isSpecialTerminal ? "FOLLOW_UP" : undefined;

    startTransition(async () => {
      try {
        const res = await updateLeadDetailsAction({
          leadId: lead.id,
          leadResponse: response || undefined,
          callbackDate: callbackDate || null,
          description: comment || undefined,
          status: statusPayload,
        });

        if (res.success) {
          toast?.success("Call update saved successfully.");
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || "Failed to save call update.");
          toast?.error(res.error || "Failed to save call update.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while saving.");
        toast?.error("An unexpected error occurred while saving.");
      }
    });
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <span>Lead Id : # {lead.id.slice(-7)}</span>
          <span className="text-xs font-normal text-[var(--muted)]">({lead.name})</span>
        </div>
      }
      description={
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border)] mt-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-[var(--muted)]">
            Call Response
          </span>
          <span className="text-[var(--muted)] font-medium">
            Last Updated : {displayDate}
          </span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isPending}
            loading={isPending}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {errorMessage && (
          <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
            {errorMessage}
          </div>
        )}

        {/* 1. Select Response & Add Followup Button */}
        <Field label="Call Response" id="update-response">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                id="update-response"
                value={response}
                onChange={(e) => handleResponseChange(e.target.value)}
                className="w-full text-xs"
              >
                {activeResponses.length === 0 && !response ? (
                  <option value="">
                    {isLoadingResponses ? "Loading responses..." : "No responses configured"}
                  </option>
                ) : (
                  <>
                    <option value="">Select Response</option>
                    {response &&
                      !["CLIENT", "CLIENTS"].includes(response.trim().toUpperCase()) &&
                      !activeResponses.includes(response) && (
                        <option value={response}>{response} (Existing)</option>
                      )}
                    {activeResponses
                      .filter((opt) => !["CLIENT", "CLIENTS"].includes(opt.trim().toUpperCase()))
                      .map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                  </>
                )}
              </Select>
            </div>

            <Button
              type="button"
              variant={isFollowup ? "primary" : "secondary"}
              size="sm"
              onClick={handleAddFollowupClick}
              className="shrink-0"
            >
              {isFollowup ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
              <span>Add Followup</span>
            </Button>
          </div>
        </Field>

        {/* 2. Select Date (native datetime-local preserved per audit) */}
        <Field label="Callback Date & Time" id="update-callback">
          <input
            id="update-callback"
            type="datetime-local"
            value={callbackDate}
            onChange={(e) => setCallbackDate(e.target.value)}
            className="inp w-full text-xs py-2"
          />
        </Field>

        {/* 3. Description / Comment Box */}
        <Field label="Conversation Remarks / Description" id="update-comment">
          <Textarea
            id="update-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Add follow-up call notes, client feedback, or discussion remarks..."
            className="w-full text-xs"
          />
        </Field>
      </div>
    </Modal>
  );
}
