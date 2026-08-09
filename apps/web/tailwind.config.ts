import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          950: "#050b12",
          900: "#0a121c",
          800: "#101c29",
          700: "#182636",
          600: "#223549",
          500: "#324a63",
        },
        accent: {
          500: "#22c55e",
          600: "#16a34a",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
