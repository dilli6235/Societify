import type { Config } from 'tailwindcss';

/**
 * Societify dark theme — ported from the Greenwood Heights prototype.
 *
 * Two things happen here:
 *  1. Semantic tokens (`bg`, `surface`, `ink`, `muted`, `acid`, …) are added for
 *     new components to use directly.
 *  2. The `slate` and `brand` ramps are *remapped* to dark-theme values so the
 *     existing pages — which lean on `text-slate-*`, `bg-slate-*`,
 *     `border-slate-*`, `bg-brand-*` — flip to dark automatically without having
 *     to rewrite every utility class. Low slate numbers become dark surfaces,
 *     high numbers become light text (an inversion of the usual ramp).
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Semantic design tokens ───────────────────────────────────────
        bg: '#0e1714',
        surface: '#14201c',
        surface2: '#1a2823',
        surface3: '#21322b',
        line: 'rgba(255,255,255,0.08)',
        line2: 'rgba(255,255,255,0.14)',
        ink: '#eef3f0',
        muted: '#8ba096',
        faint: '#5f7268',
        green: { DEFAULT: '#3fcf8e', dim: '#1f6f4d' },
        acid: { DEFAULT: '#c8f04b', ink: '#15240a' }, // lime primary CTA
        amberx: { DEFAULT: '#e8b04b', dim: '#7a5816' },
        info: { DEFAULT: '#5aa9f0', dim: '#1d4a73' },
        danger: { DEFAULT: '#f0746e', dim: '#7a2622' },

        // ── Remapped neutral ramp (dark) ─────────────────────────────────
        // bg/fill end (low) → dark surfaces & lines; text end (high) → light.
        slate: {
          50: '#1a2823',
          100: '#21322b',
          200: 'rgba(255,255,255,0.08)',
          300: 'rgba(255,255,255,0.14)',
          400: '#5f7268',
          500: '#8ba096',
          600: '#9fb3a9',
          700: '#c2d0c9',
          800: '#e3ebe7',
          900: '#eef3f0',
          950: '#f5f8f6',
        },

        // ── Remapped brand ramp → green family ───────────────────────────
        brand: {
          50: '#1a2823',
          100: '#21322b',
          200: '#2a4035',
          300: '#1f6f4d',
          400: '#34b87c',
          500: '#3fcf8e',
          600: '#3fcf8e',
          700: '#6fe0aa',
          800: '#1f6f4d',
          900: '#173d2b',
        },
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
