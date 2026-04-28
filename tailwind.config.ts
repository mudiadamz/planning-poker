import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b1929",
          soft: "#0f2238",
          panel: "#13314f",
        },
        accent: {
          DEFAULT: "#3b82f6",
          soft: "#60a5fa",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        flip: {
          "0%": { transform: "rotateY(180deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
        pop: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        floatUp: {
          "0%": {
            transform: "translateY(0) scale(0.6) rotate(-8deg)",
            opacity: "0",
          },
          "10%": {
            transform: "translateY(-4vh) scale(1.1) rotate(0deg)",
            opacity: "1",
          },
          "85%": { opacity: "1" },
          "100%": {
            transform: "translateY(-90vh) scale(1.5) rotate(12deg)",
            opacity: "0",
          },
        },
      },
      animation: {
        flip: "flip 350ms ease-out",
        pop: "pop 200ms ease-out",
        "float-up": "floatUp 3s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
