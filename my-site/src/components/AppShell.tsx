"use client";

import type { JSX, ReactNode, KeyboardEvent } from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, LogOut, Plus, FileText, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AppShellProps {
  children: ReactNode;
  projectId?: number;
  projectName?: string;
}

/**
 * Application shell with header and navigation. When a project is loaded,
 * the header displays the project name and allows inline editing.
 */
export function AppShell({
  children,
  projectId,
  projectName,
}: AppShellProps): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleValue, setTitleValue] = useState<string>(projectName ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onToggle = useCallback((): void => {
    setOpen((v) => !v);
  }, []);

  const onOpenChange = useCallback((open: boolean): void => {
    setOpen(open);
  }, []);

  useEffect((): void => {
    setTitleValue(projectName ?? "");
  }, [projectName]);

  useEffect((): void => {
    if (isEditingTitle) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingTitle]);

  const startEditing = useCallback((): void => {
    if (!projectId) {
      return;
    }
    setIsEditingTitle(true);
  }, [projectId]);

  const cancelEditing = useCallback((): void => {
    setTitleValue(projectName ?? "");
    setIsEditingTitle(false);
  }, [projectName]);

  const submitTitle = useCallback(async (): Promise<void> => {
    if (!projectId) {
      setIsEditingTitle(false);
      return;
    }
    const next = titleValue.trim();
    if (!next) {
      cancelEditing();
      return;
    }
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
    } catch (e) {
      console.error("Failed to update project name", e);
      setTitleValue(projectName ?? "");
    } finally {
      setIsEditingTitle(false);
    }
  }, [projectId, titleValue, projectName, cancelEditing]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        void submitTitle();
      } else if (e.key === "Escape") {
        cancelEditing();
      }
    },
    [submitTitle, cancelEditing]
  );

  return (
    <div className="min-h-dvh grid grid-rows-[56px_1fr] grid-cols-1">
      <header className="h-14 border-b flex items-center gap-3 px-4 bg-background relative z-30 touch-manipulation">
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggle}
              aria-label="Toggle navigation"
            >
              <Menu className="h-4 w-4" />
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>
                Access your projects and tools
              </SheetDescription>
            </SheetHeader>
            <nav className="space-y-2 mt-6">
              <Link href="/new" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </Link>
              <Link href="/create" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </Link>
              <Link href="/projects" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Projects
                </Button>
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        {projectId && (projectName || titleValue) ? (
          <div className="font-semibold">
            {isEditingTitle ? (
              <input
                ref={inputRef}
                value={titleValue}
                onChange={(e): void => setTitleValue(e.target.value)}
                onBlur={(): void => {
                  void submitTitle();
                }}
                onKeyDown={onKeyDown}
                className="px-2 py-1 rounded border text-base"
                aria-label="Project name"
              />
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="hover:underline"
                aria-label="Edit project name"
              >
                {titleValue || projectName}
              </button>
            )}
          </div>
        ) : (
          <div className="font-semibold">Banananano</div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <form action="/api/logout" method="post">
            <Button variant="outline" size="sm" type="submit">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </form>
        </div>
      </header>
      <div className="relative h-full">
        <main className="h-full overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
