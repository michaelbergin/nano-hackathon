"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { generateProjectName } from "@/lib/projectNameGenerator";

export default function NewProjectPage(): JSX.Element {
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        // If a project was just created in this session, reuse it to avoid duplicates
        const existing = sessionStorage.getItem("justCreatedProjectId");
        if (existing) {
          sessionStorage.removeItem("justCreatedProjectId");
          router.replace(`/create?id=${existing}`);
          return;
        }

        // Generate a random creative name for the project
        const randomName = generateProjectName();

        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: randomName }),
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) {
          router.push("/projects");
          return;
        }
        const data = await res.json();
        try {
          sessionStorage.setItem(
            "justCreatedProjectId",
            String(data.project.id)
          );
          localStorage.setItem("activeProjectId", String(data.project.id));
          localStorage.setItem("activeProjectName", data.project.name ?? "");
        } catch {
          // ignore storage errors
        }
        router.replace(`/create?id=${data.project.id}`);
      } catch (err: unknown) {
        if ((err as { name?: string } | null)?.name === "AbortError") {
          return;
        }
        router.push("/projects");
      }
    })();
    return () => {
      controller.abort();
    };
  }, [router]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl w-full space-y-6 p-6 text-center">
        <h1 className="text-2xl font-semibold">Creating your project…</h1>
        <p className="text-muted-foreground">Redirecting to the canvas.</p>
      </div>
    </AppShell>
  );
}
