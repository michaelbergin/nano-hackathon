"use client";

import { useCallback } from "react";
import { CanvasBoard } from "@/components/CanvasBoard";
import type { JSX } from "react";

interface ProjectCanvasProps {
  projectId: number;
  initialData: string | null;
}

export function ProjectCanvas({
  projectId,
  initialData,
}: ProjectCanvasProps): JSX.Element {
  const onSave = useCallback(
    async (data: string): Promise<void> => {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
      } catch (err) {
        console.error("Failed to save canvas data:", err);
      }
    },
    [projectId]
  );

  return <CanvasBoard initialData={initialData || undefined} onSave={onSave} />;
}
