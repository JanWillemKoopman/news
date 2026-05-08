import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-styrene)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      colors: {
        // Anthropic-geïnspireerd warm palet
        cream: {
          50: '#faf9f5',   // bijna-wit ivoor (lichte kaarten / hover)
          100: '#f5f1e8',  // zacht ivoor
          200: '#f0eee6',  // 'book' — primaire chat-achtergrond
          300: '#ebe5d7',
          400: '#e3dacc',  // verhoogd vlak / panel
          500: '#d8cfbf',  // randen
          600: '#bdb3a1',  // muted iconen
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
          400: '#807d76',
          500: '#5e5d59',  // muted body
          600: '#3f3e3a',
          700: '#2c2b27',  // body
          800: '#1f1e1c',
          900: '#141413',  // koppen
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
