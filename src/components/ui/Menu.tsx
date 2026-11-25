"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/src/lib/utils";
import { useEscape } from "@/src/hooks/useEscape";
import { useOutsideClick } from "@/src/hooks/useOutsideClick";

export interface MenuProps {
  /** Content of the trigger button. */
  trigger: ReactNode;
  /** Accessible name for the trigger button. */
  label: string;
  align?: "left" | "right";
  /**
   * `parent`: on phones the panel spans the full width of the nearest positioned ancestor
   * (use for menus inside the navbar so they never overflow the viewport).
   */
  anchor?: "self" | "parent";
  triggerClassName?: string;
  /** Panel content, or a render function that receives `close`. */
  children: ReactNode | ((close: () => void) => ReactNode);
}

/** Glass popover anchored to a button. Closes on outside click and Escape (focus returns to trigger). */
export function Menu({
  trigger,
  label,
  align = "right",
  anchor = "self",
  triggerClassName,
  children,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const reduce = useReducedMotion();
  const close = useCallback(() => setOpen(false), []);
  const onEscape = useCallback(() => {
    setOpen(false);
    btn.current?.focus();
  }, []);
  useOutsideClick(wrap, close, open);
  useEscape(onEscape, open);

  return (
    <div ref={wrap} className="menu" data-anchor={anchor}>
      <button
        ref={btn}
        type="button"
        className={cn("btn btn-sec", triggerClassName)}
        style={{ padding: "8px 10px" }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open && (
        <motion.div
          id={panelId}
          className="glass glass-pop menu-panel"
          data-align={align}
          initial={reduce ? false : { opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduce ? 0 : 0.18, ease: "easeOut" }}
        >
          {typeof children === "function" ? children(close) : children}
        </motion.div>
      )}
    </div>
  );
}
