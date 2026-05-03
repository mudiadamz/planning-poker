import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planning Poker",
  description:
    "Real-time scrum planning poker for distributed teams. Create a room, share the link, and vote on story points together.",
};

export const viewport: Viewport = {
  themeColor: "#0a3d2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
