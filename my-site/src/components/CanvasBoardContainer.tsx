"use client";

import type { JSX, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface CanvasBoardContainerProps {
  className?: string;
}

export function CanvasBoardContainer({
  className,
  children,
}: PropsWithChildren<CanvasBoardContainerProps>): JSX.Element {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-2 rounded-xl border shadow-sm min-h-0 h-full",
        // No vertical padding; content should fill fully for the canvas
        "p-0 select-none",
        className
      )}
    >
      <div className="h-full w-full">{children}</div>
    </div>
  );
}

export default CanvasBoardContainer;
