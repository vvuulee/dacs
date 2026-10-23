/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-beige': '#EAD8C0', 
        'brand-light': '#F9F8F6', 
        'brand-dark': '#333333',  
      }
    },
  },
  plugins: [],
}