/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0a0a0f",
        abyss: "#12121a",
        slate: { 850: "#1a1a2e" },
        ember: { 400: "#f97316", 500: "#ea580c", 600: "#c2410c" },
        arcane: { 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" },
        heal: { 400: "#4ade80", 500: "#22c55e" },
        frost: { 400: "#38bdf8", 500: "#0ea5e9" },
      },
      fontFamily: {
        game: ['"Press Start 2P"', "monospace"],
        ui: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(139,92,246,0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(139,92,246,0.6)" },
        },
      },
    },
  },
  plugins: [],
};
