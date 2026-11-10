import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: { marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } } },
      animation: { marquee: "marquee 30s linear infinite" },
      colors: {
        brand: { 50: "#fff4f2", 100: "#ffe4e0", 200: "#ffc9c2", 300: "#ffa196", 400: "#fa7366", 500: "#ee5448", 600: "#d63f36", 700: "#b3322b", 800: "#8f2c27", 900: "#762a26" },
        night: { 700: "#312a52", 800: "#26203f", 900: "#1c1830" },
        blush: { 50: "#fff8f6", 100: "#fff0ed" },
        ink: { 50: "#f5f7f7", 100: "#e6ebec", 200: "#ccd6d8", 300: "#a5b5b9", 400: "#76898f", 500: "#5a6e74", 600: "#485860", 700: "#3d4a50", 800: "#2f3a3f", 900: "#1c2427" },
        teal: { 50: "#effaf8", 100: "#d7f2ee", 500: "#2a9d8f", 600: "#1f8176", 700: "#1d675f" },
      },
      fontFamily: { sans: ["var(--font-figtree)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"] },
    },
  },
  plugins: [],
  // animazioni usate dalla landing

};
export default config;
