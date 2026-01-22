/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFD535',
          50: '#FFF9E5',
          100: '#FFF3CC',
          200: '#FFE799',
          300: '#FFDB66',
          400: '#FFD535',
          500: '#E6BF00',
          600: '#B39500',
          700: '#806B00',
          800: '#4D4000',
          900: '#1A1600',
        },
        background: {
          DEFAULT: '#0D1117',
          secondary: '#161B22',
          tertiary: '#1E2329',
        },
        text: {
          primary: '#F0F6FC',
          secondary: '#8B949E',
          muted: '#6E7681',
        },
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
