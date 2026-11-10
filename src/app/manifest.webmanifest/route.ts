/** T-01: PWA installabile da telefono. */
export function GET() {
  return Response.json(
    {
      name: "Working Mom",
      short_name: "Working Mom",
      start_url: "/app",
      display: "standalone",
      background_color: "#fbf8f6",
      theme_color: "#d63f36",
      lang: "it",
      icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
