import type { Config } from 'tailwindcss';

const c = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        surface2: c('surface2'),
        line: c('line'),
        fg: c('fg'),
        muted: c('muted'),
        primary: { DEFAULT: c('primary'), strong: c('primary-strong'), soft: c('primary-soft'), on: c('on-primary') },
        danger: { DEFAULT: c('danger'), soft: c('danger-soft') },
        chip: { DEFAULT: c('chip'), fg: c('chip-fg') },
        amber: c('amber'),
      },
      fontFamily: {
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: { sheet: '0 -10px 40px rgba(8,40,28,.14)' },
    },
  },
  plugins: [],
} satisfies Config;
