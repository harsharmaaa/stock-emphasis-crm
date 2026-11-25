"use client";

import React, { CSSProperties } from "react";

interface Orb {
  size: number;
  pos: CSSProperties;
  gradient: string;
  variant?: "b" | "c";
  delay: number;
}

const ORBS: readonly Orb[] = [
  { size: 84, pos: { top: "9%", left: "30%" }, gradient: "var(--og-blue)", delay: 0 },
  { size: 56, pos: { top: "18%", right: "9%" }, gradient: "var(--og-lav)", variant: "b", delay: -9 },
  { size: 100, pos: { top: "46%", left: "12%" }, gradient: "var(--og-cyan)", variant: "c", delay: -15 },
  { size: 44, pos: { top: "62%", right: "22%" }, gradient: "var(--og-violet)", delay: -20 },
  { size: 72, pos: { bottom: "8%", left: "48%" }, gradient: "var(--og-blue)", variant: "b", delay: -5 },
  { size: 50, pos: { bottom: "20%", right: "6%" }, gradient: "var(--og-lav)", variant: "c", delay: -26 },
];

/**
 * FloatingOrbs / AmbientOrbs
 * Six small, slow, decorative ambient glowing orbs behind the CRM UI.
 * Styled using the .orb utility classes from ui-kit.css and design tokens from tokens.css.
 * Never interactive (pointer-events-none); disabled by prefers-reduced-motion.
 */
export function FloatingOrbs() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0"
    >
      {ORBS.map((o, i) => (
        <div
          key={i}
          className={o.variant ? `orb ${o.variant}` : "orb"}
          style={{
            width: o.size,
            height: o.size,
            background: o.gradient,
            animationDelay: `${o.delay}s`,
            ...o.pos,
          }}
        />
      ))}
    </div>
  );
}

export { FloatingOrbs as AmbientOrbs };
