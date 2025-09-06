import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hackathon App",
  description: "Fast, simple, shipped.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh h-dvh overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
