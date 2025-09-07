import type { JSX } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProjectCanvas } from "../projects/[id]/ProjectCanvas";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CanvasBoardContainer } from "@/components/CanvasBoardContainer";

interface CreatePageProps {
  searchParams: Promise<{ id?: string }>; // keep promise style consistent with other pages
}

export default async function CreatePage({
  searchParams,
}: CreatePageProps): Promise<JSX.Element> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value ?? null;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload) {
    redirect("/account/login");
  }

  // Read project id from querystring
  const { id: idStr } = await searchParams;
  const projectId = idStr ? parseInt(idStr, 10) : NaN;
  if (!idStr || Number.isNaN(projectId)) {
    redirect("/projects");
  }

  // Load project for this user
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: payload.userId },
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
