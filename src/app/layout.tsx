import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://crown-pilot.vercel.app"),
  alternates: { canonical: "/" },
  applicationName: "Crown-pilot",
  title: {
    default: "Crown-pilot — Clash Royale Companion",
    template: "%s | Crown-pilot",
  },
  description: "Crown-pilot is an unofficial Clash Royale companion for your cards, decks, battles, strategies, and public game data.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/crown-pilot-mark.svg", type: "image/svg+xml" },
      { url: "/brand/crown-pilot-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/brand/crown-pilot-mark.svg",
    apple: [{ url: "/brand/crown-pilot-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Crown-pilot",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    title: "Crown-pilot — Clash Royale Companion",
    description: "Your cards. Your deck. Your arena. One simple companion.",
    siteName: "Crown-pilot",
    url: "/",
    images: [{ url: "/brand/crown-pilot-192.png", width: 192, height: 192, alt: "Crown-pilot logo" }],
  },
  twitter: {
    card: "summary",
    title: "Crown-pilot — Clash Royale Companion",
    images: ["/brand/crown-pilot-192.png"],
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
