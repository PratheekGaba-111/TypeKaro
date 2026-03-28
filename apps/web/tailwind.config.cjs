/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0c1b",
        cloud: "#f6f4f0",
        accent: "#e4572e",
        mint: "#2ec4b6",
        lilac: "#b69cff"
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
        body: ["Work Sans", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "8px 10px 0 rgba(46, 196, 182, 0.18), 0 18px 36px rgba(0, 0, 0, 0.32)"
      }
    }
  },
  plugins: []
};
