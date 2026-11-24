import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/src/lib/utils";
import type { Tone } from "@/src/types/ui-kit";

export interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Badge({ tone = "info", dot, className, style, children }: BadgeProps) {
  return (
    <span className={cn("badge", `b-${tone}`, className)} style={style}>
      {dot && <i className="dot" />}
      {children}
    </span>
  );
}
