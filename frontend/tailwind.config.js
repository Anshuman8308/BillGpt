/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#F5A623",
          light: "#FFC94D",
          dark: "#E08E00",
        },
        cream: "#FFF8E7",
        ink: "#1A1400",
        accent: {
          green: "#1E8E3E",
          red: "#C0392B",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(0,0,0,0.08)",
        pill: "0 1px 4px rgba(0,0,0,0.12)",
      },
      backgroundImage: {
        "surface-gradient": "linear-gradient(180deg, #FFC94D 0%, #F5A623 55%, #E08E00 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        pop: {
          "0%": { transform: "scale(0.96)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        shimmer: "shimmer 1.6s infinite linear",
        pop: "pop 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
