"use client";

import { type ReactNode } from "react";
import { Modal, type ModalSize } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { Icon, type IconName } from "@/src/components/ui/Icon";

export type ConfirmDialogTone = "danger" | "warning" | "info";

export interface ConfirmDialogProps {
  /** Whether the confirmation dialog is open. */
  open: boolean;
  /** Callback fired when the dialog is cancelled or closed. */
  onClose: () => void;
  /** Callback fired when the user confirms the action. */
  onConfirm: () => void;
  /** Dialog title (e.g. "Delete Lead", "Deactivate User"). */
  title: ReactNode;
  /** Optional descriptive explanation of the action's consequence. */
  description?: ReactNode;
  /** Label for the confirm button. Defaults to tone-appropriate text ("Delete", "Continue", "Confirm"). */
  confirmText?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelText?: string;
  /** Visual tone of the confirmation dialog. Defaults to 'danger'. */
  tone?: ConfirmDialogTone;
  /** Whether the confirmation action is currently pending/executing. */
  loading?: boolean;
  /** Width size variant of the dialog. Defaults to 'sm'. */
  size?: Extract<ModalSize, "sm" | "md" | "lg">;
  /** Optional custom icon to override the tone's default icon. */
  icon?: IconName;
  /** Optional custom body content. */
  children?: ReactNode;
}

const TONE_CONFIG: Record<
  ConfirmDialogTone,
  {
    icon: IconName;
    iconColor: string;
    confirmVariant: "danger" | "primary";
    confirmClassName?: string;
    defaultConfirmText: string;
  }
> = {
  danger: {
    icon: "TriangleAlert",
    iconColor: "var(--err)",
    confirmVariant: "danger",
    defaultConfirmText: "Delete",
  },
  warning: {
    icon: "TriangleAlert",
    iconColor: "var(--warn)",
    confirmVariant: "primary",
    confirmClassName: "!bg-[var(--warn)] !text-white hover:!opacity-90 !border-transparent",
    defaultConfirmText: "Continue",
  },
  info: {
    icon: "Info",
    iconColor: "var(--brand)",
    confirmVariant: "primary",
    defaultConfirmText: "Confirm",
  },
};

/**
 * Reusable Confirmation Dialog Component.
 * Built on top of Modal and Button primitives.
 * Features:
 * - Danger (destructive/red), Warning (cautionary/amber), and Info (neutral/blue) semantic tones.
 * - Loading-state protection: disables both buttons and prevents backdrop/escape closing while async confirmation is in flight.
 * - Accessible focus management, focus trap, and Escape handling inherited from Modal.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  tone = "danger",
  loading = false,
  size = "sm",
  icon,
  children,
}: ConfirmDialogProps) {
  const config = TONE_CONFIG[tone];
  const effectiveIcon = icon || config.icon;
  const effectiveConfirmText = confirmText || config.defaultConfirmText;

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      size={size}
      closeOnEscape={!loading}
      closeOnBackdropClick={!loading}
      showCloseButton={!loading}
      title={
        <div className="flex items-center gap-2.5">
          <span
            style={{ color: config.iconColor }}
            className="flex shrink-0"
            aria-hidden="true"
          >
            <Icon name={effectiveIcon} size={20} />
          </span>
          <span className="truncate">{title}</span>
        </div>
      }
      description={description}
      footer={
        <>
          <Button
            variant="sec"
            disabled={loading}
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            className={config.confirmClassName}
            loading={loading}
            disabled={loading}
            onClick={onConfirm}
          >
            {effectiveConfirmText}
          </Button>
        </>
      }
    >
      {children !== undefined && children !== null ? children : null}
    </Modal>
  );
}
