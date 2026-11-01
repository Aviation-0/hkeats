import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        safety: {
          clean: "#10b981",
          warning: "#f59e0b",
          suspended: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
export default config;
