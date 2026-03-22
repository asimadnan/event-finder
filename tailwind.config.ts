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
        ink: "#101828",
        mist: "#f5f7fb",
        line: "#d0d5dd",
      },
      boxShadow: {
        panel: "0 24px 60px rgba(15, 23, 42, 0.08)",
      },
      animation: {
        drift: "drift 7s ease-in-out infinite",
        rise: "rise 0.45s ease-out forwards",
        pulseSoft: "pulseSoft 2.2s ease-in-out infinite",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translateY(0) translateX(0)", opacity: "0.2" },
          "50%": { transform: "translateY(-10px) translateX(6px)", opacity: "0.4" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "1" },
        },
      },
      fontFamily: {
        display: ["var(--font-heading)", "Georgia", "serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
