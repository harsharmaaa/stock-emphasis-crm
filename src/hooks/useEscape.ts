"use client";

import { useEffect } from "react";

/** Calls `onEscape` when Escape is pressed while `active`. */
export function useEscape(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onEscape, active]);
}
