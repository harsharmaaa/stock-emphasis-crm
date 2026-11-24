import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/src/lib/utils";

export interface FieldProps {
  label: string;
  id?: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + optional description/error text with accessible ARIA association. */
export function Field({
  label,
  id: explicitId,
  description,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const id = explicitId || generatedId;
  const descriptionId = description ? `${id}-desc` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label className="lbl mb-0" htmlFor={id}>
          {label}
          {required && <span className="text-[var(--err)] ml-1" aria-hidden="true">*</span>}
        </label>
      </div>

      {description && (
        <p id={descriptionId} className="text-xs text-[var(--muted)]">
          {description}
        </p>
      )}

      {children}

      {error && (
        <div id={errorId} className="field-error" role="alert" aria-live="polite">
          {error}
        </div>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, id, "aria-describedby": ariaDescribedBy, ...rest },
  ref
) {
  const hasError = Boolean(error);
  return (
    <input
      ref={ref}
      id={id}
      aria-invalid={hasError || undefined}
      aria-describedby={ariaDescribedBy}
      className={cn(
        "inp",
        hasError && "!border-[var(--err)] focus:!ring-[var(--err)]",
        className
      )}
      {...rest}
    />
  );
});

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: readonly (string | SelectOption)[];
  error?: boolean | string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className, error, id, children, "aria-describedby": ariaDescribedBy, ...rest },
  ref
) {
  const hasError = Boolean(error);
  return (
    <select
      ref={ref}
      id={id}
      aria-invalid={hasError || undefined}
      aria-describedby={ariaDescribedBy}
      className={cn(
        "inp",
        hasError && "!border-[var(--err)] focus:!ring-[var(--err)]",
        className
      )}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options
        ? options.map((opt) => {
            if (typeof opt === "string") {
              return (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              );
            }
            return (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            );
          })
        : children}
    </select>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 3, error, id, "aria-describedby": ariaDescribedBy, ...rest },
  ref
) {
  const hasError = Boolean(error);
  return (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      aria-invalid={hasError || undefined}
      aria-describedby={ariaDescribedBy}
      className={cn(
        "inp",
        hasError && "!border-[var(--err)] focus:!ring-[var(--err)]",
        className
      )}
      {...rest}
    />
  );
});
