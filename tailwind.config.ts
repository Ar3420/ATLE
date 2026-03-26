import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8f4ea",
        foreground: "#4d556f",
        border: "#e4d7ba",
        input: "#fffdf8",
        ring: "#d4b36c",
        card: "#fffdf8",
        muted: "#f3ead8",
        accent: "#e4bd62",
        "accent-foreground": "#5a4720",
        danger: "#ef4444",
        warning: "#c8942c",
      },
      backgroundImage: {
        grid:
          "radial-gradient(circle at center, rgba(63, 63, 70, 0.35) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "26px 26px",
      },
      boxShadow: {
        panel:
          "0 18px 40px -26px rgba(148, 120, 56, 0.18), inset 0 1px 0 rgba(255,255,255,0.82)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
