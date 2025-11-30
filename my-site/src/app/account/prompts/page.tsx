import type { JSX } from "react";
import { redirect } from "next/navigation";
import { stackServerApp } from "@/stack/server";
import { syncUserToDatabase, hasAppAccess } from "@/lib/userSync";
import { AppShell } from "@/components/AppShell";
import { PromptsManager } from "./PromptsManager";

/**
 * Account prompts page - allows users to manage their custom prompts
 */
export default async function PromptsPage(): Promise<JSX.Element> {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const dbUser = await syncUserToDatabase({
    id: user.id,
    primaryEmail: user.primaryEmail,
    displayName: user.displayName,
  });

  if (!dbUser || !hasAppAccess(dbUser.status)) {
    redirect("/");
  }

  return (
    <AppShell>
      <PromptsManager userEmail={user.primaryEmail ?? user.id} />
    </AppShell>
  );
}

