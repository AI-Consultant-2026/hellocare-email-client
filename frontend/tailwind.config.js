/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // HelloCare Consulting's real brand tokens (navy/gold), matching the live
        // marketing site rather than an invented palette.
        navy: "#141B2C",
        gold: "#A0762F",
      },
      fontFamily: {
        serif: ["Instrument Serif", "Georgia", "serif"],
        sans: ["Public Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
