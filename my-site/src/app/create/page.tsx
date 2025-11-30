import type { JSX } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProjectCanvas } from "../projects/[id]/ProjectCanvas";
import { stackServerApp } from "@/stack/server";
import { prisma } from "@/lib/prisma";
import { syncUserToDatabase, hasAppAccess } from "@/lib/userSync";
import { CanvasBoardContainer } from "@/components/CanvasBoardContainer";

interface CreatePageProps {
  searchParams: Promise<{ id?: string }>; // keep promise style consistent with other pages
}

export default async function CreatePage({
  searchParams,
}: CreatePageProps): Promise<JSX.Element> {
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

  // Read project id from querystring
  const { id: idStr } = await searchParams;
  const projectId = idStr ? parseInt(idStr, 10) : NaN;
  if (!idStr || Number.isNaN(projectId)) {
    redirect("/projects");
  }

  // Load project for this user
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
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
