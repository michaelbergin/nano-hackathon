import type { JSX } from "react";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProjectCanvas } from "./ProjectCanvas";
import { CanvasBoardContainer } from "@/components/CanvasBoardContainer";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({
  params,
}: ProjectPageProps): Promise<JSX.Element> {
  const { id } = await params;
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
  type ProjectRecord = {
    id: number;
    name: string;
    data: string | null;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
  };
  const project = await (
    prisma as unknown as {
      project: {
        findFirst: (args: unknown) => Promise<ProjectRecord | null>;
      };
    }
  ).project.findFirst({
    where: {
      id: projectId,
      userId: payload.userId, // Ensure user can only access their own projects
    },
  });

  if (!project) {
    redirect("/projects");
  }

  return (
    <AppShell projectId={project.id} projectName={project.name}>
      <div className="w-full h-full grid grid-rows-[1fr] gap-4 overflow-hidden p-4">
        <CanvasBoardContainer className="min-h-0 h-full">
          <ProjectCanvas projectId={project.id} initialData={project.data} />
        </CanvasBoardContainer>
      </div>
    </AppShell>
  );
}
