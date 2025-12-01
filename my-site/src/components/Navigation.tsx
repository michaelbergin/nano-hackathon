"use client";

import type { JSX, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, FolderOpen, Clock, MessageSquare } from "lucide-react";
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

/** Recent project entry */
interface RecentProject {
  id: number;
  name: string;
  lastOpenedAt: number;
}

interface NavigationProps {
  projectId?: number;
  lastActiveProjectId?: number | null;
}

interface NavigationRowProps {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}

/**
 * Consistent navigation row component
 */
function NavigationRow({ href, icon, children }: NavigationRowProps): JSX.Element {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors"
    >
      <span className="h-4 w-4 flex items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}

const RECENT_KEY = "recentProjects";

/**
 * Navigation component for the left rail sidebar.
 * Includes project navigation and recent projects.
 */
export function Navigation({
  projectId,
  lastActiveProjectId,
}: NavigationProps): JSX.Element {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  // Load recent projects from localStorage
  const loadRecents = useCallback((): RecentProject[] => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list = raw ? (JSON.parse(raw) as RecentProject[]) : [];
      const sanitized = Array.isArray(list) ? list : [];
      return sanitized
        .filter((p) => p.name.trim().toLowerCase() !== "untitled")
        .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
        .slice(0, 5);
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    setRecentProjects(loadRecents());
  }, [loadRecents]);

  const createHref = projectId
    ? `/create?id=${projectId}`
    : lastActiveProjectId
    ? `/create?id=${lastActiveProjectId}`
    : "/projects";

  return (
    <>
      <SheetHeader>
        <SheetTitle>Navigation</SheetTitle>
        <SheetDescription>Access your projects and tools</SheetDescription>
      </SheetHeader>

      <nav className="space-y-1 mt-6">
        {/* Primary Navigation */}
        <NavigationRow href="/new" icon={<Plus className="h-4 w-4" />}>
          New Project
        </NavigationRow>
        <NavigationRow href={createHref} icon={<FileText className="h-4 w-4" />}>
          Create
        </NavigationRow>
        <NavigationRow href="/projects" icon={<FolderOpen className="h-4 w-4" />}>
          Projects
        </NavigationRow>
        <NavigationRow href="/account/prompts" icon={<MessageSquare className="h-4 w-4" />}>
          Styles
        </NavigationRow>

        {/* Divider */}
        <div className="h-px bg-border my-3" />

        {/* Recent Projects */}
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Recent Projects
          </div>
          {recentProjects.length > 0 ? (
            recentProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors truncate"
                title={p.name}
              >
                <span className="truncate">{p.name}</span>
              </Link>
            ))
          ) : (
            <div className="px-2 py-1 text-xs text-muted-foreground">
              No recent projects
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
