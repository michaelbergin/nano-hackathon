import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { CanvasBoard } from "@/components/CanvasBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Users } from "lucide-react";

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
          <header className="space-y-2 text-center">
            <h1 className="text-4xl font-bold tracking-tight">Banananano</h1>
            <p className="text-lg text-muted-foreground">Fun with AI</p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Join the Waitlist
              </CardTitle>
              <CardDescription>
                Be the first to know when we launch. Get early access to
                AI-powered tools.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action="/api/subscribe"
                method="post"
                className="flex gap-2"
              >
                <Input
                  required
                  name="email"
                  type="email"
                  placeholder="you@domain.com"
                  className="flex-1"
                />
                <Button type="submit">Join Waitlist</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Latest Signups
              </CardTitle>
              <CardDescription>
                Recent people who joined our waitlist
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {subs.map((s) => (
                  <li
                    key={s.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <span className="font-medium">{s.email}</span>
                    <time className="text-sm text-muted-foreground">
                      {s.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                    </time>
                  </li>
                ))}
                {subs.length === 0 && (
                  <li className="text-muted-foreground py-3">
                    No signups yet.
                  </li>
                )}
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Reload the page after submitting to see updates.
              </p>
            </CardContent>
          </Card>

          <footer className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Banananano
          </footer>
        </main>
      )}
    </AppShell>
  );
}
