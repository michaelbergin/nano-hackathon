import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hackathon App",
  description: "Fast, simple, shipped.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
