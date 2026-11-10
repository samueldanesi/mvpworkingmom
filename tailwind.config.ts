import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: { marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } } },
      animation: { marquee: "marquee 30s linear infinite" },
      colors: {
        brand: { 50: "#f5f2fa", 100: "#e8e2f3", 200: "#d0c4e7", 300: "#b59fd6", 400: "#9768b9", 500: "#7a5fa5", 600: "#5b4b8a", 700: "#4b3d75", 800: "#3d3260", 900: "#2f264b" },
        rose: { 50: "#fff5f8", 100: "#ffe6ee", 200: "#ffccde", 300: "#ffb3cb", 400: "#ff85ab", 500: "#f5679a" },
        night: { 700: "#44386d", 800: "#3a2f5e", 900: "#2b2248" },
        blush: { 50: "#fdf7fa", 100: "#ffe6ee" },
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
