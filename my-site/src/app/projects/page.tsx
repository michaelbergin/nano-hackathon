import type { JSX } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";
import { syncUserToDatabase, hasAppAccess } from "@/lib/userSync";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Calendar, FolderOpen } from "lucide-react";

export default async function ProjectsPage(): Promise<JSX.Element> {
  // Ensure user is authenticated via Stack Auth
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

  // Only list projects that belong to this user
  const projects = (await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  })) as Array<{
    id: number;
    name: string;
    data: string | null;
    screenshotUrl: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  const visibleProjects = projects.filter((p) => {
    const name = p.name.trim().toLowerCase();
    return name !== "untitled";
  });

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full min-h-0">
        {/* Header Section - Non-scrollable */}
        <div className="border-b bg-white/50 backdrop-blur-sm flex-shrink-0">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
                <p className="text-gray-600 mt-1">
                  {visibleProjects.length === 0
                    ? "Get started by creating your first project"
                    : `${visibleProjects.length} project${
                        visibleProjects.length === 1 ? "" : "s"
                      }`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Project
                  </Button>
                </Link>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-6 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search projects..." className="pl-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Projects Grid - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {visibleProjects.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <FolderOpen className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No projects yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Start building something amazing. Create your first project
                  and bring your ideas to life.
                </p>
                <Link href="/new">
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create Your First Project
                  </Button>
                </Link>
              </div>
            ) : (
              /* Projects Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                {visibleProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block h-full"
                  >
                    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-blue-200 overflow-hidden h-full">
                      {/* Thumbnail */}
                      {project.screenshotUrl && (
                        <div className="aspect-video w-full bg-gray-100 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${project.screenshotUrl}?t=${new Date(
                              project.updatedAt
                            ).getTime()}&w=400&q=auto&f=auto`}
                            alt={`${project.name} thumbnail`}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            loading="lazy"
                            crossOrigin="anonymous"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors line-clamp-2">
                            {project.name}
                          </CardTitle>
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            Active
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          Created {formatDate(project.createdAt)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="text-xs text-gray-500">
                            Last updated: {formatDate(project.updatedAt)}
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-3/4 transition-all duration-300 group-hover:w-full"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
