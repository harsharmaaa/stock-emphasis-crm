"use client";

import { useEffect, type RefObject } from "react";

/** Calls `onOutside` when a mousedown happens outside `ref`. */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  active = true
): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside, active]);
}
