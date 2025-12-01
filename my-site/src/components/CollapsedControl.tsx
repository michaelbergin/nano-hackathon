"use client";

import type { JSX, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Direction = "left" | "right" | "top" | "bottom";

export interface CollapsedControlProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  collapsed: ReactNode;
  expanded: ReactNode;
  className?: string;
  collapsedClassName?: string;
  expandedClassName?: string;
  enterFrom?: Direction; // expanded enters from this direction
  leaveTo?: Direction; // collapsed leaves to this direction
  alignment?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  durationMs?: number;
}

const dirToTranslate = (dir: Direction): string => {
  switch (dir) {
    case "left":
      return "-translate-x-24";
    case "right":
      return "translate-x-24";
    case "top":
      return "-translate-y-24";
    case "bottom":
      return "translate-y-24";
    default:
      return "";
  }
};

const alignmentToAnchor = (
  align: NonNullable<CollapsedControlProps["alignment"]>
): { collapsed: string; expanded: string } => {
  switch (align) {
    case "top-left":
      return { collapsed: "top-0 left-0", expanded: "top-0 left-0" };
    case "top-right":
      return { collapsed: "top-0 right-0", expanded: "top-0 right-0" };
    case "bottom-left":
      return { collapsed: "bottom-0 left-0", expanded: "bottom-0 left-0" };
    case "bottom-right":
    default:
      return { collapsed: "bottom-0 right-0", expanded: "bottom-0 right-0" };
  }
};

export function CollapsedControl({
  open,
  onOpen,
  // onClose,
  collapsed,
  expanded,
  className,
  collapsedClassName,
  expandedClassName,
  enterFrom,
  leaveTo,
  alignment = "bottom-right",
  durationMs = 200,
}: CollapsedControlProps): JSX.Element {
  const duration = "duration-200"; // ensure presence; also set style for exact ms
  const anchor = alignmentToAnchor(alignment);
  const derived = alignment.includes("left") ? "left" : "right";
  const enterFromFinal: Direction = enterFrom ?? derived;
  const leaveToFinal: Direction = leaveTo ?? derived;

  return (
    <div
      className={cn("relative", className)}
      style={{ transitionDuration: `${durationMs}ms` }}
    >
      {/* When closed, reserve space for the collapsed icon so stacks don't jump */}
      {!open && <div aria-hidden className={cn(collapsedClassName)} />}

      {/* Collapsed icon container */}
      <div
        aria-hidden={open}
        className={cn(
          "absolute z-10 transition-all ease-in-out",
          duration,
          anchor.collapsed,
          open
            ? cn("opacity-0 pointer-events-none", dirToTranslate(leaveToFinal))
            : "opacity-100 translate-x-0 translate-y-0"
        )}
        onClick={onOpen}
      >
        <div className={cn(collapsedClassName)}>{collapsed}</div>
      </div>

      {/* Expanded panel container */}
      <div
        aria-hidden={!open}
        className={cn(
          "transition-all ease-in-out z-20",
          duration,
          open
            ? cn("relative opacity-100 translate-x-0 translate-y-0")
            : cn(
                "absolute opacity-0 pointer-events-none",
                anchor.expanded,
                dirToTranslate(enterFromFinal)
              )
        )}
      >
        <div className={cn(expandedClassName)}>{expanded}</div>
      </div>

      {/* Close click area helper (optional, consumers provide their own close button) */}
      {/* Intentionally not adding an overlay; consumers close from inside content */}
    </div>
  );
}
