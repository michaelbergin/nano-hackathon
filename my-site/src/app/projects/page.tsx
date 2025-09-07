import type { JSX } from "react";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProjectsPage(): Promise<JSX.Element> {
  // Ensure user is authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value ?? null;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload) {
    redirect("/account/login");
  }

  // Only list projects that belong to this user
  const projects = await prisma.project.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const visibleProjects = projects.filter((p) => {
    const name = (p.name ?? "").trim().toLowerCase();
    return name !== "untitled";
  });
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl w-full space-y-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <ul className="divide-y">
          {visibleProjects.map((p) => (
            <li key={p.id} className="py-3">
              <Link
                href={`/projects/${p.id}`}
                className="block rounded hover:bg-gray-50 px-2 py-1"
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500">
                  {p.createdAt.toISOString()}
                </div>
              </Link>
            </li>
          ))}
          {visibleProjects.length === 0 && (
            <li className="py-3 text-gray-500">No projects yet.</li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
