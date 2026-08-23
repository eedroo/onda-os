import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':    '#ffffff',
        'bg-surface': '#ffffff',
        'bg-card':    '#ffffff',
        'bg-input':   '#f8f9fa',
        'border-subtle': '#e5e7eb',
        'border-strong': '#d1d5db',
        'brand':      '#0ea5e9',
        'brand-dark': '#0284c7',
        'text-primary':   '#18181b',
        'text-secondary': '#3f3f46',
        'text-muted':     '#71717a',
        'text-faint':     '#a1a1aa',
        'accent-blue':   '#0284c7',
        'accent-teal':   '#0891b2',
        'accent-green':  '#16a34a',
        'accent-purple': '#7c3aed',
        'accent-amber':  '#d97706',
        'accent-red':    '#dc2626',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
export default config
