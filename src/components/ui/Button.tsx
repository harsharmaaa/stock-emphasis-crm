"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/src/lib/utils";
import { Icon, type IconName } from "@/src/components/ui/Icon";

export type ButtonVariant = "primary" | "secondary" | "sec" | "grad" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  /** Backwards compatibility with UI Kit's icon prop */
  icon?: IconName;
  loadingText?: string;
  children?: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 h-8 gap-1.5 rounded-[10px]",
  md: "text-sm px-4 py-2 h-10 gap-2 rounded-xl",
  lg: "text-base px-5 py-2.5 h-12 gap-2.5 rounded-[14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    icon,
    loadingText,
    className,
    type = "button",
    children,
    ...rest
  },
  ref
) {
  const effectiveVariant = variant === "secondary" ? "sec" : variant;
  const effectiveLeftIcon = leftIcon || icon;
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      className={cn(
        "btn",
        `btn-${effectiveVariant}`,
        sizeClasses[size],
        fullWidth && "w-full justify-center",
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      {...rest}
    >
      {loading ? (
        <svg
          className="animate-spin shrink-0"
          style={{
            width: size === "sm" ? 14 : size === "lg" ? 18 : 16,
            height: size === "sm" ? 14 : size === "lg" ? 18 : 16,
          }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      ) : effectiveLeftIcon ? (
        <Icon name={effectiveLeftIcon} size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />
      ) : null}

      {loading && loadingText ? (
        <span>{loadingText}</span>
      ) : (
        children
      )}

      {!loading && rightIcon && (
        <Icon name={rightIcon} size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />
      )}
    </button>
  );
});
