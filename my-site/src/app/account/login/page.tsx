import { redirect } from "next/navigation";
import { stackServerApp } from "@/stack/server";

/**
 * Legacy login route - redirects to Stack Auth sign-in
 * Stack Auth provides the sign-in UI at /handler/sign-in
 */
export default async function LoginPage() {
  // Check if user is already signed in
  const user = await stackServerApp.getUser();
  if (user) {
    redirect("/");
  }

  // Redirect to Stack Auth sign-in page
  redirect("/handler/sign-in");
}
