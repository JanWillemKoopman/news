import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontSize: {
        '2xl': '1rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['var(--font-serif)', '"Cormorant Garamond"', 'Georgia', 'Cambria', 'serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        header: {
          bg: 'hsl(var(--header-bg))',
          fg: 'hsl(var(--header-fg))',
          muted: 'hsl(var(--header-muted))',
          active: 'hsl(var(--header-active))',
          border: 'hsl(var(--header-border))',
        },
        // Riley & Grey "rhino" navy — gebruikt voor de donkere header en
        // accenten. Overgenomen uit hun productionsite.
        rhino: {
          50: '#f4f7fb',
          100: '#e8eef6',
          200: '#cdddea',
          300: '#a0c0d9',
          400: '#6fa0c4',
          500: '#4b83ac',
          600: '#396990',
          700: '#2f5475',
          800: '#2a4862',
          900: '#263c50',
          950: '#1a2937',
        },
        // Riley & Grey "pink" — primaire actiekleur (dusty rose).
        rose: {
          50: '#fbf5f6',
          100: '#f5e3e7',
          200: '#f1dae0',
          300: '#e6bbc7',
          400: '#d795a9',
          500: '#c46f8a',
          600: '#ad5173',
          700: '#913f5f',
          800: '#7a3754',
          900: '#69324b',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        sm: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
        DEFAULT: '0 2px 8px -2px rgb(15 23 42 / 0.08)',
        md: '0 6px 20px -4px rgb(15 23 42 / 0.10)',
        lg: '0 12px 32px -8px rgb(15 23 42 / 0.12)',
        xl: '0 20px 48px -12px rgb(15 23 42 / 0.16)',
        // Subtiele schaduw onder de donkere header.
        header: '0 1px 0 0 rgb(0 0 0 / 0.06)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'overlay-in': 'overlayIn 0.2s ease-out',
        'dialog-in': 'dialogIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'sheet-in': 'sheetIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        overlayIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        dialogIn: {
          '0%': { opacity: '0', transform: 'translate(-50%, -48%) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        sheetIn: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
