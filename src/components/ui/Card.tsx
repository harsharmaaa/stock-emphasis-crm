import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Slightly more opaque glass – use for overlays/popovers. */
  strong?: boolean;
}

export function Card({ strong, className, ...rest }: CardProps) {
  return <div className={cn("glass", strong && "glass-strong", className)} {...rest} />;
}
