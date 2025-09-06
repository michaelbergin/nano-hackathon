import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import type { JSX } from "react";
import { ProjectCanvas } from "./ProjectCanvas";

interface ProjectPageProps {
  params: { id: string };
}

export default async function ProjectPage({
  params,
}: ProjectPageProps): Promise<JSX.Element> {
  const { id } = params;
  const projectId = parseInt(id, 10);

  if (isNaN(projectId)) {
    redirect("/projects");
  }

  // Get authenticated user
  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value ?? null;
  const payload = token ? await verifyAuthToken(token) : null;

  if (!payload) {
    redirect("/account/login");
  }

  // Get project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: payload.userId, // Ensure user can only access their own projects
    },
  });

  if (!project) {
    redirect("/projects");
  }

  return (
    <AppShell>
      <div className="w-full h-full grid grid-rows-[auto_1fr] gap-3 overflow-hidden">
        <div className="px-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <div className="text-sm text-gray-500">
            Created {project.createdAt.toLocaleDateString()}
          </div>
        </div>
        <div className="min-h-0 h-full">
          <ProjectCanvas projectId={project.id} initialData={project.data} />
        </div>
      </div>
    </AppShell>
  );
}
