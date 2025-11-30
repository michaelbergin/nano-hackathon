"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Plus, Banana } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserButton } from "@stackframe/stack";
import { Navigation } from "./Navigation";
import { useMobile } from "@/hooks/useMobile";

interface HeaderProps {
  projectId?: number;
  projectName?: string;
}

/**
 * Header component with branding, navigation menu, and user actions
 */
export function Header({ projectId, projectName }: HeaderProps): JSX.Element {
  const router = useRouter();
  const isMobile = useMobile();
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [pendingName, setPendingName] = useState<string>(projectName ?? "");
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  // When viewing a project, add/update it in recents with latest timestamp
  useEffect((): void => {
    if (!projectId || !projectName) {
      return;
    }
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
          <Navigation
            projectId={projectId}
            lastActiveProjectId={lastActiveProjectId}
          />
        </SheetContent>
      </Sheet>

      {/* Branding + Quick Create */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <Banana className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
        {!isMobile && (
          <div className="font-semibold text-sm sm:text-lg truncate">
            MonkeyDoodle
          </div>
        )}
        <Button
          variant="outline"
          size={isMobile ? "icon" : "sm"}
          aria-label="Create new project"
          title="Create new project"
          className="ml-1 sm:ml-2 transition-all duration-300 ease-in-out hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-md focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 active:scale-95 rounded-md"
          onClick={handleCreateUntitled}
        >
          <Plus className={`h-4 w-4 transition-transform duration-300 ease-in-out ${!isMobile ? "mr-2" : ""}`} />
          {!isMobile && "New"}
        </Button>
      </div>

      {/* Centered Project Name */}
      {projectId ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-textpx-12">
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

      {/* User Menu - Stack Auth UserButton */}
      <div className="ml-auto">
        <UserButton />
      </div>
    </header>
  );
}
