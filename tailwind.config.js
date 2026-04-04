export default {
  content: ['./extend/**/*.{js,ts,jsx,tsx,mdx}', './core/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        zuume: ['var(--font-zuume)'],
      },
    },
  },
  plugins: [],
};
