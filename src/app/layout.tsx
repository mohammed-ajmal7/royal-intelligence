import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  applicationName: "CrownPilot",
  title: {
    default: "CrownPilot — Clash Royale Companion",
    template: "%s | CrownPilot",
  },
  description: "CrownPilot is an unofficial Clash Royale companion for your cards, decks, battles, strategies, and public game data.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/crownpilot-mark.svg", type: "image/svg+xml" }],
    shortcut: "/brand/crownpilot-mark.svg",
    apple: [{ url: "/brand/crownpilot-mark.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "CrownPilot",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    title: "CrownPilot — Clash Royale Companion",
    description: "Your cards. Your deck. Your arena. One simple companion.",
    siteName: "CrownPilot",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#17459f",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
