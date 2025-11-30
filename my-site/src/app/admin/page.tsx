import type { JSX } from "react";
import { redirect } from "next/navigation";
import { stackServerApp } from "@/stack/server";
import { syncUserToDatabase, hasAdminAccess } from "@/lib/userSync";
import { AdminDashboard } from "./AdminDashboard";

/**
 * Admin panel page
 * Only accessible by users with admin status
 */
export default async function AdminPage(): Promise<JSX.Element> {
  const stackUser = await stackServerApp.getUser();

  if (!stackUser || !stackUser.primaryEmail) {
    redirect("/handler/sign-in");
  }

  const dbUser = await syncUserToDatabase({
    id: stackUser.id,
    primaryEmail: stackUser.primaryEmail,
    displayName: stackUser.displayName,
  });

  if (!dbUser || !hasAdminAccess(dbUser.status)) {
    redirect("/");
  }

  return <AdminDashboard adminEmail={dbUser.email} />;
}

