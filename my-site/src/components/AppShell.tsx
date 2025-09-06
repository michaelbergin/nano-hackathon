"use client";

import type { JSX, ReactNode } from "react";
import { useState, useCallback } from "react";
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

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);

  const onToggle = useCallback((): void => {
    setOpen((v) => !v);
  }, []);

  const onOpenChange = useCallback((open: boolean): void => {
    setOpen(open);
  }, []);

  return (
    <div className="min-h-dvh grid grid-rows-[56px_1fr] grid-cols-1">
      <header className="h-14 border-b flex items-center gap-3 px-4 bg-background relative z-30">
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

        <div className="font-semibold">Banananano</div>
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
