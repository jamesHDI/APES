/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fc',
          400: '#36aef8',
          500: '#0c92e7',
          600: '#0274c7',
          700: '#035ca3',
          800: '#074f85',
          900: '#0c426e',
          950: '#082a49',
        },
        hdi: {
          red: '#c8102e',
          darkRed: '#9b0b21',
          gold: '#eaaa00',
          navy: '#0c2340',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
