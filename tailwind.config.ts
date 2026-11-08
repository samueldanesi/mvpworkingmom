import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#fdf3f1", 100: "#fbe5e0", 200: "#f6c9bf", 300: "#efa595", 400: "#e47a65", 500: "#d65a43", 600: "#b94430", 700: "#993827", 800: "#7e3125", 900: "#692d24" },
        ink: { 50: "#f5f7f7", 100: "#e6ebec", 200: "#ccd6d8", 300: "#a5b5b9", 400: "#76898f", 500: "#5a6e74", 600: "#485860", 700: "#3d4a50", 800: "#2f3a3f", 900: "#1c2427" },
        teal: { 50: "#effaf8", 100: "#d7f2ee", 500: "#2a9d8f", 600: "#1f8176", 700: "#1d675f" },
      },
      fontFamily: { sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
