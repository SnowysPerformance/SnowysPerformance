/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#14161C",
        surface: "#1C1F27",
        raised: "#252932",
        inputbg: "#191C23",
        edge: "#333744",
        edgesoft: "#292D38",
        primary: "#ECEEF2",
        muted: "#8F94A3",
        faint: "#5B5F6E",
        accent: "#7EC8E3",
        accentstrong: "#5FAFCB",
        accenttext: "#0C2733",
        chalk: "#E3B23C",
        good: "#6FA96A",
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        sans: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
