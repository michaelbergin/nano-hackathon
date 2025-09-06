"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, User, LogOut, Plus, FileText, FolderOpen } from "lucide-react";
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
import { BananaIcon } from "@/components/BananaIcon";

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
    const trimmed = (pendingName ?? "").trim();
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
            <Link href="/create">
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
          </nav>
        </SheetContent>
      </Sheet>

      {/* Branding + Quick Create */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <BananaIcon className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
        <div className="font-semibold text-sm sm:text-lg truncate">
          <span className="hidden sm:inline">Banananano</span>
          <span className="sm:hidden">Banananano</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Create new project"
          title="Create new project"
          className="ml-1 sm:ml-2 transition-all duration-300 ease-in-out hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-md focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 active:scale-95 border border-transparent hover:border-primary/20 rounded-md"
          onClick={handleCreateUntitled}
        >
          <Plus className="h-4 w-4 transition-transform duration-300 ease-in-out" />
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
              {pendingName || projectName || "Untitled"}
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
