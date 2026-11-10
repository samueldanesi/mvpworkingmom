import { ServiceWorker } from "@/components/ServiceWorker";
import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: { default: "Working Mom", template: "%s · Working Mom" },
  description: "Specialisti per la genitorialità, per le persone e per le aziende.",
  manifest: "/manifest.webmanifest",
  applicationName: "Working Mom",
};

export const viewport: Viewport = { themeColor: "#5b4b8a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={figtree.variable}>
      <body>{children}<ServiceWorker /></body>
    </html>
  );
}
