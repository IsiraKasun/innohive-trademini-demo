/**** Tailwind config ****/
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0ea5e9',
          green: '#22c55e',
          dark: '#0b1220'
        }
      }
    },
  },
  plugins: [],
};
