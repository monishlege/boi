/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'power-black': '#000B1D',
        'power-cyan': '#00FFFF',
        'power-gold': '#D4AF37',
      },
    },
  },
  plugins: [],
}
