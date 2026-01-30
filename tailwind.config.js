/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F5DC',
        'cream-dark': '#E8E8C8',
      },
    },
  },
  plugins: [],
};
