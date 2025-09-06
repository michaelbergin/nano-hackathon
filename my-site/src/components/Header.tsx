"use client";

import type { JSX } from "react";
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

      {/* Branding */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <BananaIcon className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
        <div className="font-semibold text-sm sm:text-lg truncate">
          <span className="hidden sm:inline">Banananano</span>
          <span className="sm:hidden">Banananano</span>
        </div>
      </div>

      {/* Project Name (when on project page) - Hidden on small screens */}
      {projectId && projectName && (
        <div className="hidden sm:flex font-semibold text-muted-foreground truncate">
          / {projectName}
        </div>
      )}

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
