import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-styrene)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      colors: {
        // Warm palet via CSS-variabelen — wisselt automatisch met .dark op <html>
        cream: {
          50:  'rgb(var(--color-cream-50)  / <alpha-value>)',
          100: 'rgb(var(--color-cream-100) / <alpha-value>)',
          200: 'rgb(var(--color-cream-200) / <alpha-value>)',
          300: 'rgb(var(--color-cream-300) / <alpha-value>)',
          400: 'rgb(var(--color-cream-400) / <alpha-value>)',
          500: 'rgb(var(--color-cream-500) / <alpha-value>)',
          600: 'rgb(var(--color-cream-600) / <alpha-value>)',
        },
        clay: {
          50:  '#fbf3ee',
          100: '#f6e4d9',
          200: '#eec0a7',
          300: '#e89d7c',
          400: '#df8865',
          500: '#d97757',  // primair accent (knop)
          600: '#c8663f',
          700: '#a85029',
        },
        ink: {
          400: 'rgb(var(--color-ink-400) / <alpha-value>)',
          500: 'rgb(var(--color-ink-500) / <alpha-value>)',
          600: 'rgb(var(--color-ink-600) / <alpha-value>)',
          700: 'rgb(var(--color-ink-700) / <alpha-value>)',
          800: 'rgb(var(--color-ink-800) / <alpha-value>)',
          900: 'rgb(var(--color-ink-900) / <alpha-value>)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
