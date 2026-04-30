import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        serif: ["Instrument Serif", "ui-serif", "serif"],
      },
      colors: {
        ink: {
          950: "#070612",
          900: "#0b0a1a",
          800: "#11102a",
          700: "#1a1838",
          600: "#27244e",
        },
        violet: {
          glow: "#8b5cf6",
          deep: "#5b21b6",
          electric: "#a78bfa",
        },
      },
    },
  },
  plugins: [],
};

export default config;
