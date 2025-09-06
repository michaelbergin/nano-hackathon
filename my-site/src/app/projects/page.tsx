import type { JSX } from "react";
import type { JSX } from "react";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage(): Promise<JSX.Element> {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl w-full space-y-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <ul className="divide-y">
          {projects.map((p) => (
            <li key={p.id} className="py-3">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">
                {p.createdAt.toISOString()}
              </div>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="py-3 text-gray-500">No projects yet.</li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
