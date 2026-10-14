/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0b0f19", // Deep dark navy
          secondary: "#111827", // Charcoal
          elevated: "#1f2937",
        },
        primary: {
          DEFAULT: "#06b6d4", // Cyan accent
          hover: "#0891b2",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#0284c7", // Sky blue
          muted: "#38bdf8",
        },
        border: {
          DEFAULT: "#1f2937",
          subtle: "#374151",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
