import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        rojo: {
          DEFAULT: "#C8102E",
          oscuro: "#8C0E22",
          noche: "#4A0812",
        },
        carbon: "#1A1A1A",
        gris: {
          DEFAULT: "#6E6660",
          claro: "#F1ECE9",
        },
        crema: "#FAF7F5",
        borde: "#E6DEDA",
        dorado: "#F0B429",
      },
      fontFamily: {
        display: ["var(--font-bebas-neue)", "Impact", "sans-serif"],
        sans: ["var(--font-inter)", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        club: "0 8px 24px rgba(74,8,18,0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
