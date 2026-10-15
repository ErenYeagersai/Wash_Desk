import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A5F',
          light: '#2E5299',
        },
        secondary: '#F0A500',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        'text-muted': '#718096',
        success: {
          DEFAULT: '#2F855A',
          bg: '#F0FFF4',
        },
        warning: {
          DEFAULT: '#D69E2E',
          bg: '#FFFBEB',
        },
        error: {
          DEFAULT: '#C53030',
          bg: '#FFF5F5',
        },
        info: {
          DEFAULT: '#2B6CB0',
          bg: '#EBF8FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
        lg: '0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05)',
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
}

export default config
