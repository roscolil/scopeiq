import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'
import plugin from 'tailwindcss/plugin'

// ─── Exelion Design Tokens ────────────────────────────────────────────────────
const brand = {
  blue: '#0067B3',
  blueDark: '#003d6b',
  blueLight: '#0085e0',
  yellow: '#FFD230',
  black: '#000000',
  white: '#FFFFFF',
  dark: '#0A0A0A',
  surface: '#111111',
  muted: '#1C1C1C',
  navy: '#0A1628',
  grayMid: '#888888',
  grayLight: '#F4F4F4',
}

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // ── Colors ──────────────────────────────────────────────────────────────
      colors: {
        // shadcn/ui CSS-variable colors
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
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // Exelion brand palette
        brand: {
          blue: brand.blue,
          'blue-dark': brand.blueDark,
          'blue-light': brand.blueLight,
          yellow: brand.yellow,
          black: brand.black,
          white: brand.white,
          dark: brand.dark,
          surface: brand.surface,
          muted: brand.muted,
          navy: brand.navy,
          'gray-mid': brand.grayMid,
          'gray-light': brand.grayLight,
        },
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // ── Typography ──────────────────────────────────────────────────────────
      fontFamily: {
        sans: [
          'Jost',
          'Avenir Next LT Pro',
          'Avenir',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Roboto Mono',
          'source-code-pro',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        'brand-xs': ['0.75rem', { lineHeight: '1.5', fontWeight: '300' }],
        'brand-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '300' }],
        'brand-base': ['1rem', { lineHeight: '1.65', fontWeight: '300' }],
        'brand-lg': ['1.125rem', { lineHeight: '1.4', fontWeight: '300' }],
        'brand-xl': ['1.5rem', { lineHeight: '1.3', fontWeight: '300' }],
        'brand-2xl': ['2rem', { lineHeight: '1.2', fontWeight: '300' }],
        'brand-3xl': ['2.5rem', { lineHeight: '1.2', fontWeight: '300' }],
        'brand-4xl': ['3rem', { lineHeight: '1.1', fontWeight: '300' }],
        'brand-5xl': ['4rem', { lineHeight: '1.05', fontWeight: '300' }],
        'brand-6xl': ['4.5rem', { lineHeight: '1.05', fontWeight: '300' }],
        'brand-7xl': ['5rem', { lineHeight: '1.05', fontWeight: '300' }],
        'brand-8xl': ['6rem', { lineHeight: '1.0', fontWeight: '300' }],
      },
      letterSpacing: {
        brand: '0.12em',
        ultra: '0.2em',
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '92': '23rem',
        '96': '24rem',
        '104': '26rem',
        '112': '28rem',
        '128': '32rem',
      },
      width: {
        '18': '4.5rem',
      },
      height: {
        '18': '4.5rem',
      },
      maxWidth: {
        content: '80rem',
        '8xl': '88rem',
        '9xl': '96rem',
      },
      backgroundImage: {
        'gradient-hero': `linear-gradient(135deg, ${brand.blueDark} 0%, ${brand.blue} 55%, ${brand.blueLight} 100%)`,
        'gradient-brand': `linear-gradient(135deg, ${brand.blueDark} 0%, ${brand.blue} 100%)`,
        'gradient-contact': `linear-gradient(140deg, ${brand.blueDark} 0%, ${brand.blue} 100%)`,
        'glow-hero':
          'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.07) 0%, transparent 70%)',
        'orb-yellow': `radial-gradient(ellipse 60% 50% at 100% 100%, rgba(255,210,48,0.12) 0%, transparent 70%)`,
        'dot-grid-white':
          'radial-gradient(circle, #ffffff 1px, transparent 1px)',
        'line-grid-white':
          'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-80': '80px 80px',
        'grid-32': '32px 32px',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(-360deg)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'spin-slow': 'spin-slow 3s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },

      // ── Shadows ─────────────────────────────────────────────────────────────
      boxShadow: {
        soft: '0 2px 8px 0 rgb(0 0 0 / 0.04)',
        medium: '0 4px 16px 0 rgb(0 0 0 / 0.08)',
        large: '0 8px 32px 0 rgb(0 0 0 / 0.12)',
        'inner-soft': 'inset 0 1px 0 0 rgb(255 255 255 / 0.05)',
        brand: '0 4px 16px rgb(0 103 179 / 0.10)',
        'brand-md': '0 8px 32px rgb(0 103 179 / 0.10)',
        'brand-lg': '0 16px 48px rgb(0 103 179 / 0.15)',
        'brand-xl': '0 24px 64px rgb(0 103 179 / 0.20)',
        'brand-card': '0 20px 48px rgb(0 103 179 / 0.12)',
        'brand-yellow': '0 8px 32px rgb(255 210 48 / 0.20)',
        'brand-form': '0 25px 50px -12px rgb(0 103 179 / 0.10)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionDuration: {
        brand: '300ms',
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    // ── Exelion brand utilities & base styles ────────────────────────────────
    plugin(function ({ addUtilities, addBase }) {
      addBase({
        body: { fontSize: '16px', fontWeight: '300' },
        'h1, h2': { fontSize: '32px', fontWeight: '300', lineHeight: '1.2' },
        'h3, h4': { fontSize: '24px', fontWeight: '300', lineHeight: '1.3' },
        'h5, h6': { fontSize: '18px', fontWeight: '300', lineHeight: '1.4' },
        p: { fontSize: '18px', fontWeight: '300' },
      })

      addUtilities({
        '.hero-bg': {
          background: `linear-gradient(135deg, ${brand.blueDark} 0%, ${brand.blue} 55%, ${brand.blueLight} 100%)`,
        },
        '.hero-glow': {
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.07) 0%, transparent 70%)',
        },
        '.hero-dots': {
          backgroundImage:
            'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        },
        '.hero-grid': {
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        },
        '.hero-yellow-orb': {
          background:
            'radial-gradient(ellipse 60% 50% at 100% 100%, rgba(255,210,48,0.12) 0%, transparent 70%)',
        },
        '.jacq-cta-bg': {
          background: `linear-gradient(135deg, ${brand.blueDark} 0%, ${brand.blue} 100%)`,
        },
        '.contact-panel-bg': {
          background: `linear-gradient(140deg, ${brand.blueDark} 0%, ${brand.blue} 100%)`,
        },
        '.footer-bg': {
          background:
            'linear-gradient(135deg, #06101c 0%, #001e3a 30%, #002c55 55%, #001e3a 80%, #06101c 100%)',
        },
      })
    }),
  ],
} satisfies Config
