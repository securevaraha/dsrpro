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
        '18': '72px',
      },
      borderRadius: {
        'card': '16px',
      },
      ringWidth: {
        '3': '3px',
      },
      ringOffsetWidth: {
        '2': '2px',
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
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'modal': '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08)',
      }
    },
  },
  plugins: [],
}