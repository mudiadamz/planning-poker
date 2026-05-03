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
        felt: {
          DEFAULT: "#0d4f3c",
          dark: "#0a3d2e",
          light: "#15604a",
        },
        wood: {
          DEFAULT: "#5b2a1f",
          dark: "#3a1810",
          light: "#7a3a2a",
        },
        gold: {
          DEFAULT: "#d4af37",
          soft: "#f5d76e",
          dark: "#9a7a1f",
        },
        ivory: {
          DEFAULT: "#f5e9c9",
          soft: "#fdf6e3",
          dim: "#cdbf95",
        },
        cardRed: "#c8102e",
        cardBlack: "#0a0a0a",
        // Backwards-compatible aliases (some legacy classes still reference
        // these). Map to the new palette so nothing renders blue.
        bg: {
          DEFAULT: "#0a3d2e",
          soft: "#0d4f3c",
          panel: "#15604a",
        },
        accent: {
          DEFAULT: "#d4af37",
          soft: "#f5d76e",
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
        serif: [
          "ui-serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
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
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        dealIn: {
          "0%": {
            transform: "translateY(20px) scale(0.85) rotate(-6deg)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0) scale(1) rotate(0deg)",
            opacity: "1",
          },
        },
      },
      animation: {
        flip: "flip 350ms ease-out",
        pop: "pop 200ms ease-out",
        "float-up": "floatUp 3s ease-out forwards",
        shimmer: "shimmer 3s linear infinite",
        "deal-in": "dealIn 280ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
