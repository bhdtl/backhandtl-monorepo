/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', '"SF Pro"', '"SF Compact"', 'system-ui', 'sans-serif'],
      },
      colors: {
        'tennis-dark': '#0f1115',     // War vorher #0a0f0d, angepasst an deine Screenshots
        'tennis-darker': '#0a0b0e',   // Dunklerer Ton für Cards
        'tennis-green': '#22c55e',    // Tailwind green-500
        'tennis-green-dark': '#16a34a',
        'tennis-lime': '#84cc16',     // Tailwind lime-500
        'tennis-accent': '#2ecc71',
      },
    },
  },
  plugins: [],
};
