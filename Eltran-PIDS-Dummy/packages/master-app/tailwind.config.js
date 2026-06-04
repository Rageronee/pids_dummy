/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "../shared/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        kai: {
          blue: {
            DEFAULT: '#1d2d6a',
            dark: '#152355',
          },
          orange: {
            DEFAULT: '#ee6f1f',
            dark: '#d45d15',
          },
          slate: {
            bg: '#0a0f1e',
            card: '#121b2e',
          },
        },
      },
      borderRadius: {
        'kai-card': '24px',
        'kai-btn': '16px',
      },
    },
  },
  plugins: [],
};
