"use client";

import type { JSX, ReactNode } from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const onToggle = useCallback((): void => {
    setOpen((v) => !v);
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (!open) {
        return;
      }
      const target = e.target as Node | null;
      if (panelRef.current && target && !panelRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="min-h-dvh grid grid-rows-[56px_1fr] grid-cols-1">
      <header className="h-14 border-b flex items-center gap-3 px-4 bg-white relative z-30">
        <button
          onClick={onToggle}
          className="rounded border px-3 h-8 text-sm bg-white hover:bg-gray-50"
          aria-pressed={open}
          aria-label="Toggle navigation"
        >
          Menu
        </button>
        <div className="font-semibold">Banananano</div>
        <div className="ml-auto flex items-center gap-2">
          <form action="/api/logout" method="post">
            <button className="rounded border px-3 h-8 text-sm bg-white hover:bg-gray-50">
              Logout
            </button>
          </form>
        </div>
      </header>
      <div className="relative h-full">
        {open && (
          <aside
            ref={panelRef}
            className="fixed top-14 left-0 bottom-0 w-64 border-r bg-white p-3 shadow-xl z-20"
          >
            <nav className="space-y-2">
              <Link
                href="/new"
                className="block rounded px-2 py-1 hover:bg-gray-50"
              >
                New Project
              </Link>
              <Link
                href="/create"
                className="block rounded px-2 py-1 hover:bg-gray-50"
              >
                Create
              </Link>
              <Link
                href="/projects"
                className="block rounded px-2 py-1 hover:bg-gray-50"
              >
                Projects
              </Link>
            </nav>
          </aside>
        )}
        <main className="h-full overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
