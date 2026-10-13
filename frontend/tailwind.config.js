/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080B10",
        surface: {
          secondary: "#0D121A",
          card: "#131B25",
          elevated: "#1C2633",
        },
        border: {
          subtle: "#1C2633",
          DEFAULT: "#293241",
          hover: "#3E4C5E",
        },
        text: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          muted: "#64748B",
        },
        brand: {
          green: "#35E58B",
          "green-hover": "#2ED17C",
          "green-dim": "rgba(53, 229, 139, 0.12)",
        },
        warning: "#F5B942",
        danger: "#F43F5E",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Inter", "sans-serif"],
      },
      animation: {
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}
