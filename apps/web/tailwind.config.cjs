/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        cloud: "rgb(var(--c-cloud) / <alpha-value>)",
        overlay: "rgb(var(--c-overlay) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        mint: "rgb(var(--c-mint) / <alpha-value>)",
        lilac: "rgb(var(--c-lilac) / <alpha-value>)"
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
        body: ["Work Sans", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "var(--shadow-pop), var(--shadow-ambient)"
      }
    }
  },
  plugins: []
};
