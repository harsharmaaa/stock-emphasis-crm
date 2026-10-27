"use client";

import React from "react";

/**
 * FloatingOrbs
 * Decorative, ambient background gradient orbs in violet, blue, and cyan.
 * Positioned behind the CRM interface (z-0, pointer-events-none) with GPU-accelerated
 * subtle float animations. Respects prefers-reduced-motion automatically.
 */
export function FloatingOrbs() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0 transition-opacity duration-700"
    >
      {/* Orb 1: Violet / Purple (Top Left / Center) */}
      <div
        className="absolute -top-24 -left-24 sm:-top-32 sm:-left-32 w-[34rem] h-[34rem] sm:w-[48rem] sm:h-[48rem] rounded-full blur-[80px] sm:blur-[120px] animate-orb-1 transform-gpu
          bg-[radial-gradient(circle,rgba(167,139,250,0.22)_0%,rgba(139,92,246,0.12)_45%,transparent_70%)]
          dark:bg-[radial-gradient(circle,rgba(139,92,246,0.24)_0%,rgba(124,58,237,0.14)_45%,transparent_70%)]"
      />

      {/* Orb 2: Deep Blue (Top Right) */}
      <div
        className="absolute -top-20 -right-20 sm:-top-28 sm:-right-28 w-[32rem] h-[32rem] sm:w-[44rem] sm:h-[44rem] rounded-full blur-[85px] sm:blur-[125px] animate-orb-2 transform-gpu
          bg-[radial-gradient(circle,rgba(147,197,253,0.24)_0%,rgba(59,130,246,0.12)_45%,transparent_70%)]
          dark:bg-[radial-gradient(circle,rgba(59,130,246,0.22)_0%,rgba(37,99,235,0.12)_45%,transparent_70%)]"
      />

      {/* Orb 3: Cyan / Sky (Mid Left / Center) */}
      <div
        className="absolute top-1/3 -left-24 sm:top-1/3 sm:-left-36 w-[30rem] h-[30rem] sm:w-[42rem] sm:h-[42rem] rounded-full blur-[75px] sm:blur-[115px] animate-orb-3 transform-gpu
          bg-[radial-gradient(circle,rgba(165,243,252,0.20)_0%,rgba(6,182,212,0.10)_45%,transparent_70%)]
          dark:bg-[radial-gradient(circle,rgba(6,182,212,0.18)_0%,rgba(14,165,233,0.10)_45%,transparent_70%)]"
      />

      {/* Orb 4: Indigo / Violet Accent (Bottom Right) */}
      <div
        className="absolute -bottom-28 -right-28 sm:-bottom-36 sm:-right-36 w-[36rem] h-[36rem] sm:w-[48rem] sm:h-[48rem] rounded-full blur-[90px] sm:blur-[130px] animate-orb-4 transform-gpu
          bg-[radial-gradient(circle,rgba(196,181,253,0.22)_0%,rgba(99,102,241,0.10)_45%,transparent_70%)]
          dark:bg-[radial-gradient(circle,rgba(99,102,241,0.20)_0%,rgba(79,70,229,0.12)_45%,transparent_70%)]"
      />
    </div>
  );
}
