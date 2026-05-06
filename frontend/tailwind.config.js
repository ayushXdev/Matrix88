/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: "#22d3ee",
          cyanDim: "#0891b2",
          orange: "#fb923c",
          orangeDim: "#ea580c",
        },
        void: "#050508",
        panel: "#0a0c10",
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        glowCyan: "0 0 12px rgba(34, 211, 238, 0.45), inset 0 0 20px rgba(34, 211, 238, 0.06)",
        glowOrange:
          "0 0 12px rgba(251, 146, 60, 0.45), inset 0 0 20px rgba(251, 146, 60, 0.06)",
        panel: "0 0 0 1px rgba(34, 211, 238, 0.25)",
      },
    },
  },
  plugins: [],
};
