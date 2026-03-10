import typography from '@tailwindcss/typography'

export default {
  content: [
    './extend/**/*.{js,ts,jsx,tsx,mdx}',
    './core/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    colors: {
      white: '#ffffff',
      black: '#000000',
      error: '#ef4444',
      warning: '#f97316',
      success: '#22c55e',
    },
    opacity: {
      '5': '0.05',
      '10': '0.1',
      '15': '0.15',
      '20': '0.2',
      '25': '0.25',
      '30': '0.3',
      '35': '0.35',
      '40': '0.4',
      '45': '0.45',
      '50': '0.5',
      '55': '0.55',
      '60': '0.6',
      '65': '0.65',
      '70': '0.7',
      '75': '0.75',
      '80': '0.8',
      '85': '0.85',
      '90': '0.9',
      '95': '0.95',
      '100': '1',
    },
    extend: {
      fontFamily: {
        zuume: ['var(--font-zuume)'],
      },
    }
  },
  plugins: [typography]
}
