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
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
