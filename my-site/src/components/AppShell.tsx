import type { JSX, ReactNode } from "react";
import { Header } from "@/components/Header";

interface AppShellProps {
  children: ReactNode;
  projectId?: number;
  projectName?: string;
}

/**
 * Application shell with header and main content area. When a project is loaded,
 * the header displays the project name alongside the branding.
 */
export function AppShell({
  children,
  projectId,
  projectName,
}: AppShellProps): JSX.Element {
  return (
    <div className="h-dvh grid grid-rows-[56px_1fr] grid-cols-1">
      <Header projectId={projectId} projectName={projectName} />
      <div className="relative min-h-0 overflow-hidden">
        <main className="h-full min-h-0">{children}</main>
      </div>
    </div>
  );
}
