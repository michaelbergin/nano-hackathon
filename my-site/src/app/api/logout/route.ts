import { redirect } from "next/navigation";

/**
 * Legacy logout route - redirects to Stack Auth sign-out
 * Stack Auth handles logout at /handler/sign-out
 */
export async function POST(): Promise<Response> {
  // Redirect to Stack Auth sign-out
  redirect("/handler/sign-out");
}

export async function GET(): Promise<Response> {
  // Also support GET requests for direct navigation
  redirect("/handler/sign-out");
}
