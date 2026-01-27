/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      // Wheelbase brand colors from app_theme.dart
      colors: {
        'wheelbase': {
          'shark': '#1E2329',           // primaryBackground
          'yellow': '#FFD535',          // brandYellow
          'gray': '#B3B3B3',            // secondary text
          'input-bg': '#2C343D',        // inputFieldBackground
          'input-placeholder': '#788DA6',
          'error': '#FF3D61',           // errorRed
          'success': '#6CDB8C',         // successGreen
        },
        // Legacy aliases for backwards compatibility
        primary: {
          DEFAULT: '#FFD535',
        },
        background: {
          DEFAULT: '#1E2329',
          secondary: '#2C343D',
          tertiary: '#374151',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B3B3B3',
          muted: '#788DA6',
        },
        success: '#6CDB8C',
        warning: '#FF9800',
        error: '#FF3D61',
        info: '#2196F3',
      },
      fontFamily: {
        'manrope': ['Manrope', 'sans-serif'],
        sans: ['Manrope', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        // Dark theme matching Flutter app exactly (app_theme.dart)
        wheelbase: {
          "primary": "#FFD535",           // brandYellow
          "primary-content": "#000000",   // black text on yellow (WCAG AA: 14.82:1)
          "secondary": "#B3B3B3",         // gray
          "secondary-content": "#1E2329",
          "accent": "#FFD535",            // brandYellow
          "accent-content": "#000000",
          "neutral": "#2C343D",           // inputFieldBackground
          "neutral-content": "#FFFFFF",
          "base-100": "#1E2329",          // Shark (primaryBackground)
          "base-200": "#2C343D",          // inputFieldBackground
          "base-300": "#374151",          // slightly lighter
          "base-content": "#FFFFFF",      // white text
          "info": "#2196F3",
          "info-content": "#FFFFFF",
          "success": "#6CDB8C",           // successGreen
          "success-content": "#000000",
          "warning": "#FF9800",
          "warning-content": "#000000",
          "error": "#FF3D61",             // errorRed
          "error-content": "#FFFFFF",
        },
      },
    ],
    darkTheme: "wheelbase",
  },
}
