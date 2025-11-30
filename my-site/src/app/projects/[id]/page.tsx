import type { JSX } from "react";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";
import { redirect } from "next/navigation";
import { syncUserToDatabase, hasAppAccess } from "@/lib/userSync";
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

  // Get authenticated user via Stack Auth
  const user = await stackServerApp.getUser({ or: "redirect" });

  // Sync user to database and check access
  const dbUser = await syncUserToDatabase({
    id: user.id,
    primaryEmail: user.primaryEmail,
    displayName: user.displayName,
  });

  // Redirect waitlist users back to landing page
  if (!dbUser || !hasAppAccess(dbUser.status)) {
    redirect("/");
  }

  // Get project
  type ProjectRecord = {
    id: number;
    name: string;
    data: string | null;
    userId: string;
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
      userId: user.id, // Ensure user can only access their own projects
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
