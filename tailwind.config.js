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
        slate: {
          750: '#1e293b',
          850: '#0f172a',
        },
        brand: {
          50: '#FFF8F2',
          100: '#FFF4EA',
          200: '#FDE3CD',
          300: '#FBC497',
          400: '#F89E58',
          500: '#F28C28', // Primary HDI Orange
          600: '#E96B1A', // Darker Orange
          700: '#C64E09',
          800: '#9E3B07',
          900: '#7F300B',
          950: '#461704',
        },
        hdi: {
          orange: '#F28C28',
          darkOrange: '#E96B1A',
          peach: '#FFF4EA',
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
