/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#D4AF37',
        secondary: '#8B4513',
        accent: '#FF6B35',
        background: {
          DEFAULT: '#FEFEFE',
          dark: '#0A0A0B'
        },
        sidebar: {
          DEFAULT: '#1A1A2E',
          dark: '#1A1A2E'
        },
        text: {
          DEFAULT: '#2C2C54',
          dark: '#E8E8E8'
        },
        border: {
          DEFAULT: '#E5E7EB',
          dark: '#374151'
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        gold: '#D4AF37',
        emerald: '#50C878',
      },
      spacing: {
        '65': '260px',
        '16': '64px',
      },
      borderRadius: {
        'card': '16px',
      },
      fontFamily: {
        'arabic': ['Noto Sans Arabic', 'sans-serif'],
        'display': ['Playfair Display', 'serif'],
      },
      backgroundImage: {
        'dubai-gradient': 'linear-gradient(135deg, #D4AF37 0%, #FF6B35 100%)',
        'night-gradient': 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
      },
      boxShadow: {
        'dubai': '0 10px 40px rgba(212, 175, 55, 0.2)',
        'elegant': '0 8px 32px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}