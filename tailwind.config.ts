import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':    '#080e14',
        'bg-surface': '#0d1117',
        'bg-card':    '#0d1a24',
        'bg-input':   '#0a1520',
        'border-subtle': '#1a2e40',
        'border-strong': '#2d4a63',
        'brand':      '#0ea5e9',
        'brand-dark': '#0284c7',
        'text-primary':   '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-muted':     '#475569',
        'text-faint':     '#334155',
        'accent-blue':   '#38bdf8',
        'accent-teal':   '#22d3ee',
        'accent-green':  '#4ade80',
        'accent-purple': '#a78bfa',
        'accent-amber':  '#fbbf24',
        'accent-red':    '#f87171',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
export default config
