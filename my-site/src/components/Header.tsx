"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  User,
  LogOut,
  Plus,
  FileText,
  FolderOpen,
  Clock,
  Banana,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  projectId?: number;
  projectName?: string;
}

/**
 * Header component with branding, navigation menu, and user actions
 */
export function Header({ projectId, projectName }: HeaderProps): JSX.Element {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [pendingName, setPendingName] = useState<string>(projectName ?? "");
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [recentProjects, setRecentProjects] = useState<
    Array<{ id: number; name: string; lastOpenedAt: number }>
  >([]);
  const [lastActiveProjectId, setLastActiveProjectId] = useState<number | null>(
    null
  );

  // LocalStorage helpers for recent projects
  const RECENT_KEY = "recentProjects";
  const loadRecents = useCallback((): Array<{
    id: number;
    name: string;
    lastOpenedAt: number;
  }> => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list = raw
        ? (JSON.parse(raw) as Array<{
            id: number;
            name: string;
            lastOpenedAt: number;
          }>)
        : [];
      const sanitized = Array.isArray(list) ? list : [];
      return sanitized.filter(
        (p) => p.name.trim().toLowerCase() !== "untitled"
      );
    } catch {
      return [];
    }
  }, []);

  const saveRecents = useCallback(
    (list: Array<{ id: number; name: string; lastOpenedAt: number }>): void => {
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(list));
      } catch {
        // ignore write errors
      }
    },
    []
  );

  const handleCreateUntitled = useCallback((): void => {
    router.push("/new");
  }, [router]);

  useEffect((): void => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  useEffect((): void => {
    // Keep local state in sync if prop changes due to navigation
    setPendingName(projectName ?? "");
  }, [projectName]);

  // Persist active project id and name for cross-page context
  useEffect((): void => {
    try {
      if (projectId) {
        localStorage.setItem("activeProjectId", String(projectId));
        if (projectName) {
          localStorage.setItem("activeProjectName", projectName);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [projectId, projectName]);

  // Load last active project id for pages without project context
  useEffect((): void => {
    try {
      const raw = localStorage.getItem("activeProjectId");
      setLastActiveProjectId(raw ? parseInt(raw, 10) : null);
    } catch {
      setLastActiveProjectId(null);
    }
  }, []);

  // Load recent projects on mount so they show in nav even when not on a project page
  useEffect((): void => {
    const list = loadRecents()
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, 5);
    setRecentProjects(list);
  }, [loadRecents]);

  // When viewing a project, add/update it in recents with latest timestamp
  useEffect((): void => {
    if (!projectId || !projectName) return;
    const trimmed = projectName.trim();
    if (trimmed.toLowerCase() === "untitled") {
      return;
    }
    const now = Date.now();
    const current = loadRecents();
    const without = current.filter((p) => p.id !== projectId);
    const updated = [
      { id: projectId, name: trimmed, lastOpenedAt: now },
      ...without,
    ]
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, 10);
    saveRecents(updated);
    setRecentProjects(updated.slice(0, 5));
  }, [projectId, projectName, loadRecents, saveRecents]);

  const startEditingName = useCallback((): void => {
    if (!projectId) {
      return;
    }
    setIsEditingName(true);
  }, [projectId]);

  const cancelEditingName = useCallback((): void => {
    setPendingName(projectName ?? "");
    setIsEditingName(false);
  }, [projectName]);

  const submitEditingName = useCallback(async (): Promise<void> => {
    if (!projectId) {
      return;
    }
    const trimmed = pendingName.trim();
    if (!trimmed || trimmed === projectName) {
      setIsEditingName(false);
      setPendingName(projectName ?? "");
      return;
    }
    try {
      setIsSavingName(true);
      // Optimistic local update
      setIsEditingName(false);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        // Revert local state on error
        setPendingName(projectName ?? "");
        return;
      }
      setPendingName(trimmed);
      router.refresh();
    } catch {
      setPendingName(projectName ?? "");
    } finally {
      setIsSavingName(false);
    }
  }, [pendingName, projectId, projectName, router]);

  const handleNameKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
      if (e.key === "Enter") {
        e.preventDefault();
        await submitEditingName();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditingName();
      }
    },
    [cancelEditingName, submitEditingName]
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setPendingName(e.target.value);
    },
    []
  );

  return (
    <header className="h-14 border-b flex items-center gap-2 sm:gap-3 px-2 sm:px-4 bg-background relative z-30 touch-manipulation">
      {/* Navigation Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Toggle navigation">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 h-dvh overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Access your projects and tools</SheetDescription>
          </SheetHeader>
          <nav className="space-y-2 mt-6">
            <Link href="/new">
              <Button variant="ghost" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
            <Link
              href={
                projectId
                  ? `/create?id=${projectId}`
                  : lastActiveProjectId
                  ? `/create?id=${lastActiveProjectId}`
                  : "/projects"
              }
            >
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Create
              </Button>
            </Link>
            <Link href="/projects">
              <Button variant="ghost" className="w-full justify-start">
                <FolderOpen className="h-4 w-4 mr-2" />
                Projects
              </Button>
            </Link>
            {/* Divider after Projects */}
            <div className="h-px bg-border my-2" />
            {/* Recent Projects */}
            {recentProjects.length > 0 ? (
              <div className="space-y-1">
                <div className="px-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Recent projects
                </div>
                {recentProjects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start truncate"
                      title={p.name}
                    >
                      <span className="truncate">{p.name}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-2 text-xs text-muted-foreground">
                No recent projects
              </div>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Branding + Quick Create */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <Banana className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
        <div className="font-semibold text-sm sm:text-lg truncate">
          <span className="hidden sm:inline">Banananano</span>
          <span className="sm:hidden">Banananano</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          aria-label="Create new project"
          title="Create new project"
          className="ml-1 sm:ml-2 transition-all duration-300 ease-in-out hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-md focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 active:scale-95 rounded-md"
          onClick={handleCreateUntitled}
        >
          <Plus className="h-4 w-4 transition-transform duration-300 ease-in-out mr-2" />
          New
        </Button>
      </div>

      {/* Centered Project Name */}
      {projectId ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
          {isEditingName ? (
            <input
              ref={inputRef}
              type="text"
              className="pointer-events-auto bg-transparent border-b border-muted-foreground/30 focus:outline-none focus:border-primary text-sm sm:text-base md:text-lg text-foreground font-semibold text-center truncate max-w-[70%]"
              value={pendingName}
              onChange={handleNameChange}
              onBlur={submitEditingName}
              onKeyDown={handleNameKeyDown}
              aria-label="Project name"
              disabled={isSavingName}
            />
          ) : (
            <button
              type="button"
              className="pointer-events-auto font-semibold text-sm sm:text-base md:text-lg text-muted-foreground truncate max-w-[70%]"
              title="Click to rename project"
              onClick={startEditingName}
            >
              {(pendingName || projectName) ?? "Untitled"}
            </button>
          )}
        </div>
      ) : null}

      {/* User Menu */}
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Account</p>
                <p className="text-xs leading-none text-muted-foreground">
                  Manage your account
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action="/api/logout" method="post" className="w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="w-full justify-start p-0 h-auto"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </Button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
