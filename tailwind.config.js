/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sillage: {
          pink: "#fca5f1",
          cyan: "#97eaea",
          lavender: "#e2c7fc",
          gray: "#807f7a",
          dark: "#1b1521",
          light: "#f4f4f4",
        },
      },
    },
  },
  plugins: [],
};
