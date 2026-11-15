import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Royal Intelligence — Your competitive edge",
  description:
    "Your personal Clash Royale workspace. Build decks, inspect roles, and learn from your available battles.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
