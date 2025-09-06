"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";

export default function NewProjectPage(): JSX.Element {
  const router = useRouter();
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "untitled" }),
          credentials: "include",
        });
        if (!mounted) {
          return;
        }
        if (!res.ok) {
          router.push("/projects");
          return;
        }
        const data = await res.json();
        router.replace(`/create?id=${data.project.id}`);
      } catch {
        router.push("/projects");
      }
    })();
    return () => {
      mounted = false;
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
