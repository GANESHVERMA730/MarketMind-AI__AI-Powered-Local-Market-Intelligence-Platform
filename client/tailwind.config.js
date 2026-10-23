/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17251f',
        muted: '#77817b',
        canvas: '#f7f8f5',
        forest: '#1d6049',
        lime: '#cce878',
        line: '#e7ebe5',
      },
      boxShadow: {
        card: '0 12px 35px rgba(24, 47, 37, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
