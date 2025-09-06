import type { JSX } from "react";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProjectCanvas } from "./ProjectCanvas";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

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
      <div className="w-full h-full grid grid-rows-[auto_1fr] gap-4 overflow-hidden p-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">
                {project.name}
              </h1>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {project.createdAt.toLocaleDateString()}
              </Badge>
            </div>
          </CardHeader>
        </Card>
        <Card className="min-h-0 h-full">
          <CardContent className="p-0 h-full">
            <ProjectCanvas projectId={project.id} initialData={project.data} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
