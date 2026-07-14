import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette « Le Cost Killer » — Michael Barthel.
        paper: {
          DEFAULT: '#F2F7FD', // fond de page (bleu très clair)
          tint: '#E9F2FC', // surfaces secondaires
        },
        navy: {
          DEFAULT: '#000428', // texte principal (navy profond)
          700: '#2a2f4d',
        },
        brand: {
          DEFAULT: '#0062B8', // bleu corporate
          soft: '#3b86d6',
          dim: '#E9F2FC',
        },
        accent: {
          DEFAULT: '#F59331', // orange, dérivé de #FFAA5A pour le contraste
          soft: '#FFAA5A',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.15rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0, 4, 40, 0.04), 0 8px 24px -14px rgba(0, 4, 40, 0.14)',
      },
    },
  },
  plugins: [],
} satisfies Config;
