import { useId } from "react";
import { cn } from "@/src/lib/utils";

export interface AreaChartProps {
  /** Array of numeric data points */
  data: readonly number[];
  /** Accessible description of the chart for assistive technologies */
  ariaLabel: string;
  /** Viewport width of the SVG in pixels. Defaults to 520 */
  width?: number;
  /** Viewport height of the SVG in pixels. Defaults to 180 */
  height?: number;
  /** Vertical scale factor (pixels per data unit). Defaults to 1.6 */
  scale?: number;
  /** Custom CSS classes for the outer SVG container */
  className?: string;
}

/**
 * AreaChart Component — Stock Emphasis CRM UI Kit
 *
 * Lightweight, accessible pure-SVG area chart with gradient fill and line stroke.
 * Zero external charting dependencies. Powered by design tokens.
 */
export function AreaChart({
  data,
  ariaLabel,
  width = 520,
  height = 180,
  scale = 1.6,
  className,
}: AreaChartProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  if (!data || data.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height + 10}`}
        width="100%"
        role="img"
        aria-label={ariaLabel}
        className={className}
      >
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fill="var(--muted)"
          fontSize="13"
        >
          No chart data
        </text>
      </svg>
    );
  }

  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pts = data.map((p, i) => [i * step, Math.max(0, height - p * scale)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 10}`}
      width="100%"
      role="img"
      aria-label={ariaLabel}
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            style={{ stopColor: "var(--chart-area)" }}
            stopOpacity="0.4"
          />
          <stop
            offset="100%"
            style={{ stopColor: "var(--chart-area)" }}
            stopOpacity="0"
          />
        </linearGradient>
        <linearGradient id={`${uid}-l`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--chart-1)" }} />
          <stop offset="100%" style={{ stopColor: "var(--chart-2)" }} />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="0"
          x2={width}
          y1={i * 50 + 5}
          y2={i * 50 + 5}
          stroke="var(--line)"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area gradient path */}
      <path
        d={`${line} L${width},${height} L0,${height} Z`}
        fill={`url(#${uid}-a)`}
      />

      {/* Primary trend line */}
      <path
        d={line}
        fill="none"
        stroke={`url(#${uid}-l)`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Terminal data point dot */}
      {last && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r="5"
          style={{ fill: "var(--chart-dot)", stroke: "var(--chart-2)" }}
          strokeWidth="3"
        />
      )}
    </svg>
  );
}

export interface DonutSegment {
  /** Segment label */
  label: string;
  /** Percentage value (0-100) */
  value: number;
  /** CSS color string or token */
  color: string;
}

export interface DonutChartProps {
  /** Array of donut segments summing to 100 */
  segments: readonly DonutSegment[];
  /** Central text label inside the donut hole */
  centerLabel: string;
  /** Accessible description of the chart for screen readers */
  ariaLabel: string;
  /** Custom CSS classes for outer container */
  className?: string;
}

/**
 * DonutChart Component — Stock Emphasis CRM UI Kit
 *
 * Accessible SVG circular breakdown chart with percentage legend.
 * Uses SVG strokeDasharray and strokeDashoffset. Zero external dependencies.
 */
export function DonutChart({
  segments,
  centerLabel,
  ariaLabel,
  className,
}: DonutChartProps) {
  const C = 2 * Math.PI * 40; // radius = 40, circumference ≈ 251.327
  const offsets = segments.map((_, i) =>
    segments
      .slice(0, i)
      .reduce((acc, s) => acc + (Math.max(0, s.value) / 100) * C, 0)
  );

  return (
    <div
      className={cn(
        "flex items-center gap-5 flex-wrap",
        className
      )}
    >
      <svg
        width="140"
        height="140"
        viewBox="0 0 100 100"
        role="img"
        aria-label={ariaLabel}
      >
        <g transform="rotate(-90 50 50)">
          {segments.map((s, i) => {
            const d = (Math.max(0, s.value) / 100) * C;
            return (
              <circle
                key={s.label}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                style={{ stroke: s.color }}
                strokeWidth="12"
                strokeDasharray={`${Math.max(0, d - 2)} ${C - d + 2}`}
                strokeDashoffset={-(offsets[i] ?? 0)}
                strokeLinecap="round"
              />
            );
          })}
        </g>
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="var(--text)"
        >
          {centerLabel}
        </text>
      </svg>

      <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <i
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: s.color,
                display: "inline-block",
              }}
              aria-hidden="true"
            />
            <span>{s.label}</span>
            <b style={{ marginLeft: "auto", paddingLeft: 16 }}>{s.value}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface BarChartProps {
  /** Array of numeric bar values */
  data: readonly number[];
  /** Array of labels corresponding to each bar */
  labels: readonly string[];
  /** Optional index of the bar to highlight with gradient accent */
  highlightIndex?: number;
  /** Accessible description of the chart */
  ariaLabel: string;
  /** Custom CSS classes for outer container */
  className?: string;
}

/**
 * BarChart Component — Stock Emphasis CRM UI Kit
 *
 * Responsive, pure-CSS flex bar chart with label columns and accent highlight.
 * Zero external dependencies.
 */
export function BarChart({
  data,
  labels,
  highlightIndex,
  ariaLabel,
  className,
}: BarChartProps) {
  const maxVal = Math.max(1, ...data);

  return (
    <div
      className={cn("flex items-end gap-2.5 h-[140px]", className)}
      role="img"
      aria-label={ariaLabel}
    >
      {data.map((v, i) => {
        const heightPct = Math.min(100, Math.max(4, (v / maxVal) * 100));
        const isHighlight = i === highlightIndex;

        return (
          <div
            key={i}
            className="muted flex-1 text-center text-[11px] flex flex-col justify-end h-full"
          >
            <div
              style={{
                height: `${heightPct}%`,
                borderRadius: 8,
                background: isHighlight ? "var(--grad)" : "var(--line)",
                marginBottom: 6,
                transition: "height 0.3s ease",
              }}
              aria-hidden="true"
            />
            <span className="truncate block">{labels[i] ?? ""}</span>
          </div>
        );
      })}
    </div>
  );
}
