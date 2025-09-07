"use client";

import { useCallback, useEffect, useRef } from "react";
import { CanvasBoard } from "@/components/CanvasBoard";
import type { JSX } from "react";
import { getCanvasScreenshotAsync } from "@/components/canvasUtils";
import type { Layer } from "@/components/CanvasBoard";

interface ProjectCanvasProps {
  projectId: number;
  initialData: string | null;
}

export function ProjectCanvas({
  projectId,
  initialData,
}: ProjectCanvasProps): JSX.Element {
  const latestLayersRef = useRef<Layer[] | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onSave = useCallback(
    async (data: string): Promise<void> => {
      try {
        // Keep local copy of layers for screenshotting
        try {
          const parsed = JSON.parse(data) as unknown;
          if (
            parsed &&
            typeof parsed === "object" &&
            "layers" in (parsed as Record<string, unknown>) &&
            Array.isArray((parsed as { layers: unknown }).layers)
          ) {
            latestLayersRef.current = (parsed as { layers: Layer[] }).layers;
          }
        } catch {
          // ignore parse failures
        }
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

  // Initialize layers ref from initialData if present
  useEffect(() => {
    if (!initialData) {
      return;
    }
    try {
      const parsed = JSON.parse(initialData) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        "layers" in (parsed as Record<string, unknown>) &&
        Array.isArray((parsed as { layers: unknown }).layers)
      ) {
        latestLayersRef.current = (parsed as { layers: Layer[] }).layers;
      }
    } catch {
      // ignore
    }
  }, [initialData]);

  // Periodically capture a screenshot and upload
  useEffect(() => {
    let timer: number | null = null;
    const tick = async (): Promise<void> => {
      try {
        const el = containerRef.current;
        if (!el) {
          return;
        }
        const rect = el.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        // We can only screenshot from inside the CanvasBoard; expose latest visible layers
        const layers = latestLayersRef.current;
        if (!layers || width <= 0 || height <= 0) {
          return;
        }
        const dataUrl = await getCanvasScreenshotAsync(
          layers,
          width,
          height,
          1
        );
        if (!dataUrl) {
          return;
        }
        // Convert dataURL to Blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        // Upload to Cloudinary with timestamp-based public_id for unique URLs
        const timestamp = Date.now();
        const publicId = `projects/${projectId}/thumbnail_${timestamp}`;
        const form = new FormData();
        form.append("file", blob, `project-${projectId}.png`);

        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        if (uploadPreset) {
          form.append("upload_preset", uploadPreset);
          form.append("public_id", publicId);
          form.append("overwrite", "false"); // Use unique IDs instead of overwriting
          form.append("invalidate", "true");
          const up = await fetch(
            "https://api.cloudinary.com/v1_1/dqyx4lyxn/image/upload",
            { method: "POST", body: form }
          );
          const json = (await up.json()) as { secure_url?: string };
          if (typeof json.secure_url === "string") {
            // Remove version from URL to enable proper cache invalidation
            const versionlessUrl = json.secure_url.replace(/\/v\d+\//, "/");
            await fetch(`/api/projects/${projectId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ screenshotUrl: versionlessUrl }),
            });
          }
        } else {
          const signRes = await fetch("/api/cloudinary/sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              params: { 
                public_id: publicId, 
                invalidate: 1,
                timestamp: Math.floor(Date.now() / 1000)
              },
            }),
          });
          const signJson = (await signRes.json()) as {
            ok?: boolean;
            signature?: string;
            params?: Record<string, string>;
            cloudName?: string;
          };
          if (
            !signJson.ok ||
            !signJson.signature ||
            !signJson.params ||
            !signJson.cloudName
          ) {
            return;
          }
          for (const [k, v] of Object.entries(signJson.params)) {
            form.append(k, v);
          }
          form.append("signature", signJson.signature);
          form.append("api_key", "598646243146163");
          const up = await fetch(
            `https://api.cloudinary.com/v1_1/${signJson.cloudName}/image/upload`,
            { method: "POST", body: form }
          );
          const json = (await up.json()) as { secure_url?: string };
          if (typeof json.secure_url === "string") {
            // Remove version from URL to enable proper cache invalidation
            const versionlessUrl = json.secure_url.replace(/\/v\d+\//, "/");
            await fetch(`/api/projects/${projectId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ screenshotUrl: versionlessUrl }),
            });
          }
        }
      } catch {
        // ignore
      }
    };

    // First tick shortly after mount, then every 5 minutes
    const start = window.setTimeout(() => {
      void tick();
      timer = window.setInterval(() => {
        void tick();
      }, 5 * 60 * 1000) as unknown as number;
    }, 2000) as unknown as number;

    return () => {
      window.clearTimeout(start);
      if (timer) window.clearInterval(timer);
    };
  }, [projectId]);

  // Wrap CanvasBoard to capture its visible layers for screenshotting
  return (
    <div ref={containerRef} className="w-full h-full">
      <CanvasBoard
        initialData={initialData ?? undefined}
        onSave={(data): void => {
          void onSave(data);
        }}
        onScreenshot={async (dataUrl: string): Promise<void> => {
          try {
            // Convert dataURL to Blob
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const timestamp = Date.now();
            const publicId = `projects/${projectId}/thumbnail_${timestamp}`;
            const form = new FormData();
            form.append("file", blob, `project-${projectId}.png`);

            const uploadPreset =
              process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
            if (uploadPreset) {
              form.append("upload_preset", uploadPreset);
              form.append("public_id", publicId);
              form.append("overwrite", "false");
              form.append("invalidate", "true");
              const up = await fetch(
                "https://api.cloudinary.com/v1_1/dqyx4lyxn/image/upload",
                { method: "POST", body: form }
              );
              const json = (await up.json()) as { secure_url?: string };
              if (typeof json.secure_url === "string") {
                // Remove version from URL to enable proper cache invalidation
                const versionlessUrl = json.secure_url.replace(/\/v\d+\//, "/");
                await fetch(`/api/projects/${projectId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ screenshotUrl: versionlessUrl }),
                });
              }
            } else {
              const signRes = await fetch("/api/cloudinary/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  params: { 
                    public_id: publicId, 
                    invalidate: 1,
                    timestamp: Math.floor(Date.now() / 1000)
                  },
                }),
              });
              const signJson = (await signRes.json()) as {
                ok?: boolean;
                signature?: string;
                params?: Record<string, string>;
                cloudName?: string;
              };
              if (
                !signJson.ok ||
                !signJson.signature ||
                !signJson.params ||
                !signJson.cloudName
              ) {
                return;
              }
              for (const [k, v] of Object.entries(signJson.params)) {
                form.append(k, v);
              }
              form.append("signature", signJson.signature);
              form.append("api_key", "598646243146163");
              const up = await fetch(
                `https://api.cloudinary.com/v1_1/${signJson.cloudName}/image/upload`,
                { method: "POST", body: form }
              );
              const json = (await up.json()) as { secure_url?: string };
              if (typeof json.secure_url === "string") {
                // Remove version from URL to enable proper cache invalidation
                const versionlessUrl = json.secure_url.replace(/\/v\d+\//, "/");
                await fetch(`/api/projects/${projectId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ screenshotUrl: versionlessUrl }),
                });
              }
            }
          } catch {
            // ignore
          }
        }}
      />
    </div>
  );
}
