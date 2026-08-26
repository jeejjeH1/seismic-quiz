import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#825A6D",
        "primary-dark": "#6B4959",
        "primary-light": "#9C7589",
        ink: "#161616",
        surface: "#282826",
        muted: "#D4D4D4",
        line: "#A4A3A1",
      },
      fontFamily: {
        sans: ["Inter", "Vazirmatn", "system-ui", "Tahoma", "sans-serif"],
      },
      keyframes: {
        rise: {
          from: { transform: "translateY(16px)", opacity: "0.35" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        fall: {
          from: { transform: "translateY(-16px)", opacity: "0.35" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        pop: {
          from: { transform: "scale(0.94)" },
          to: { transform: "scale(1)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        rise: "rise .45s cubic-bezier(.22,1,.36,1)",
        fall: "fall .45s cubic-bezier(.22,1,.36,1)",
        pop: "pop .25s ease-out",
        fadeIn: "fadeIn .35s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
