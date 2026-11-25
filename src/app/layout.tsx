import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://royaleon.vercel.app"),
  alternates: { canonical: "/" },
  applicationName: "Royaleon",
  title: {
    default: "Royaleon — Clash Royale Companion",
    template: "%s | Royaleon",
  },
  description: "Royaleon is an unofficial Clash Royale companion for your cards, decks, battles, strategies, and public game data.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/royaleon-mark.svg", type: "image/svg+xml" },
      { url: "/brand/royaleon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/brand/royaleon-mark.svg",
    apple: [{ url: "/brand/royaleon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Royaleon",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    title: "Royaleon — Clash Royale Companion",
    description: "Your cards. Your deck. Your arena. One simple companion.",
    siteName: "Royaleon",
    url: "/",
    images: [{ url: "/brand/royaleon-192.png", width: 192, height: 192, alt: "Royaleon logo" }],
  },
  twitter: {
    card: "summary",
    title: "Royaleon — Clash Royale Companion",
    images: ["/brand/royaleon-192.png"],
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
