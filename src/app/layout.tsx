import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Working Mom", template: "%s · Working Mom" },
  description: "Specialisti per la genitorialità, per le persone e per le aziende.",
  manifest: "/manifest.webmanifest",
  applicationName: "Working Mom",
};

export const viewport: Viewport = { themeColor: "#b94430", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
