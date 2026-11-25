import { cn } from "@/src/lib/utils";

export interface TargetProgressProps {
  /** Target title */
  title: string;
  /** Subtitle / caption text */
  caption: string;
  /** Completion percentage (0 - 100) */
  percent: number;
  /** Custom CSS classes for the outer container */
  className?: string;
}

/**
 * TargetProgress Component — Stock Emphasis CRM UI Kit
 *
 * Glassmorphic target completion widget with accessible progress bar.
 */
export function TargetProgress({
  title,
  caption,
  percent,
  className,
}: TargetProgressProps) {
  const safePercent = isNaN(percent) ? 0 : percent;
  const pct = Math.min(100, Math.max(0, safePercent));

  return (
    <div
      className={cn("glass glass-strong p-3.5 rounded-2xl", className)}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>
        {title}
      </div>
      <div
        className="muted"
        style={{ fontSize: 12, margin: "2px 0 10px" }}
      >
        {caption}
      </div>
      <div
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        style={{
          height: 6,
          borderRadius: 9,
          background: "var(--line)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 9,
            background: "var(--grad)",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
