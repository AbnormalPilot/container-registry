/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0066cc",
        "primary-focus": "#0071e3",
        "primary-dark": "#2997ff",
        ink: "#1d1d1f",
        body: "#1d1d1f",
        muted: "#7a7a7a",
        line: "#e0e0e0",
        panel: "#ffffff",
        wash: "#f5f5f7",
        pearl: "#fafafc",
        tile: "#272729",
        "tile-2": "#2a2a2c",
        "tile-3": "#252527"
      },
      boxShadow: {
        product: "rgba(0, 0, 0, 0.22) 3px 5px 30px 0",
        soft: "0 0 0 1px rgba(0, 0, 0, 0.04)"
      }
    }
  },
  plugins: []
};
