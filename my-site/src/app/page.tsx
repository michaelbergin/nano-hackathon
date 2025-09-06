import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { CanvasBoard } from "@/components/CanvasBoard";

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value ?? null;
  const isAuthed = token ? (await verifyAuthToken(token)) !== null : false;

  const subs = isAuthed
    ? []
    : await prisma.subscriber.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });

  return (
    <AppShell>
      {isAuthed ? (
        <div className="w-full h-full">
          <CanvasBoard />
        </div>
      ) : (
        <main className="mx-auto max-w-3xl p-6 space-y-8 w-full">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">Banananano</h1>
            <p className="text-gray-600">Fun with AI</p>
          </header>

          <form action="/api/subscribe" method="post" className="flex gap-2">
            <input
              className="border rounded px-3 py-2 flex-1"
              required
              name="email"
              type="email"
              placeholder="you@domain.com"
            />
            <button className="rounded bg-black text-white px-4">
              Join Waitlist
            </button>
          </form>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Latest signups</h2>
            <ul className="divide-y">
              {subs.map((s) => (
                <li
                  key={s.id}
                  className="py-2 flex items-center justify-between"
                >
                  <span>{s.email}</span>
                  <time className="text-sm text-gray-500">
                    {s.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                  </time>
                </li>
              ))}
              {subs.length === 0 && (
                <li className="text-gray-500 py-2">No signups yet.</li>
              )}
            </ul>
            <p className="text-sm text-gray-500">
              Reload the page after submitting to see updates.
            </p>
          </section>

          <footer className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()}
          </footer>
        </main>
      )}
    </AppShell>
  );
}
