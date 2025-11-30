import type { JSX } from "react";
import { stackServerApp } from "@/stack/server";
import { syncUserToDatabase, hasAppAccess, hasAdminAccess } from "@/lib/userSync";
import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";

export default async function LandingPage(): Promise<JSX.Element> {
  const stackUser = await stackServerApp.getUser();

  const dbUser = stackUser
    ? await syncUserToDatabase({
        id: stackUser.id,
        primaryEmail: stackUser.primaryEmail,
        displayName: stackUser.displayName,
      })
    : null;

  const isOnWaitlist = dbUser?.status === "waitlist";
  const hasAccess = dbUser ? hasAppAccess(dbUser.status) : false;
  const isAdmin = dbUser ? hasAdminAccess(dbUser.status) : false;

  return (
    <div className="min-h-dvh w-full bg-[#0a0a0b] text-white relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-orange-400/5 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/3 rounded-full blur-[150px]" />
      </div>

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-dvh px-6">
        {/* Logo/Icon */}
        <div className="mb-8 relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 flex items-center justify-center shadow-2xl shadow-amber-500/20">
            <span className="text-4xl">🍌</span>
          </div>
          <div className="absolute -inset-1 bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 rounded-2xl blur-xl opacity-30 -z-10" />
        </div>

        {/* Title */}
        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-normal tracking-tight text-center mb-4">
          <span className="bg-gradient-to-r from-white via-amber-100 to-white bg-clip-text text-transparent">
            MonkeyDoodle
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-zinc-400 text-center max-w-md mb-12 font-light">
          Where imagination meets AI.
          <br />
          <span className="text-zinc-500">Something extraordinary is coming.</span>
        </p>

        {/* CTA Section */}
        {stackUser ? (
          isOnWaitlist ? (
            /* Waitlist confirmation */
            <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-emerald-300 font-medium">
                    You&apos;re on the list
                  </span>
                  <span className="text-sm text-zinc-500">
                    {stackUser.primaryEmail}
                  </span>
                </div>
              </div>
              <p className="text-sm text-zinc-500 text-center max-w-sm">
                We&apos;ll notify you when it&apos;s your turn. Stay tuned for something special.
              </p>
            </div>
          ) : hasAccess ? (
            /* User has access - show enter app button */
            <Link
              href="/new"
              className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-medium text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/30"
            >
              <Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12" />
              Enter MonkeyDoodle
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 blur-xl opacity-0 group-hover:opacity-40 transition-opacity -z-10" />
            </Link>
          ) : null
        ) : (
          /* Not signed in - show join waitlist */
          <Link
            href="/handler/sign-up"
            className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-medium text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-white/20"
          >
            <Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12" />
            Join the Waitlist
            <div className="absolute inset-0 rounded-full bg-white blur-xl opacity-0 group-hover:opacity-20 transition-opacity -z-10" />
          </Link>
        )}

        {/* Secondary action */}
        {!stackUser && (
          <Link
            href="/handler/sign-in"
            className="mt-4 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Already have an account? Sign in
          </Link>
        )}

        {/* Admin link - only shown to admins */}
        {isAdmin && (
          <Link
            href="/admin"
            className="mt-8 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Admin Panel →
          </Link>
        )}
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 left-0 right-0 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} MonkeyDoodle
      </footer>
    </div>
  );
}
