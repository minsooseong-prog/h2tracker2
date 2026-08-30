import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#101613", muted: "#6A7370", faint: "#9AA3A0" },
        line: { DEFAULT: "#E6E9E7", strong: "#D2D8D5" },
        surface: { DEFAULT: "#F7F9F8", sunken: "#F1F4F3" },
        brand: { DEFAULT: "#00795F", dark: "#005E4A", soft: "#E8F4F0" },
        status: {
          free: "#0B7A55",
          normal: "#A6690B",
          busy: "#C0392B",
          neutral: "#5B6360",
        },
      },
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "system-ui", "-apple-system", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.035em",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 22, 19, 0.04), 0 8px 24px -16px rgba(16, 22, 19, 0.18)",
        lift: "0 2px 6px rgba(16, 22, 19, 0.06), 0 16px 40px -20px rgba(16, 22, 19, 0.28)",
      },
      maxWidth: {
        page: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
