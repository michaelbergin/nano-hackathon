import type { JSX } from "react";
import type { JSX } from "react";
import { AppShell } from "@/components/AppShell";
import { CanvasBoard } from "@/components/CanvasBoard";

export default function CreatePage(): JSX.Element {
  return (
    <AppShell>
      <div className="w-full h-full">
        <CanvasBoard />
      </div>
    </AppShell>
  );
}
