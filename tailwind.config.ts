import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#120f0e",
        card: "#1f1815",
        accent: "#f2a93b",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
      },
      keyframes: {
        "ticket-in": {
          "0%": { transform: "translateY(120%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "ticket-in": "ticket-in 280ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
