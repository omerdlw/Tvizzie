module.exports = {
  printWidth: 100,
  useTabs: false,
  tabWidth: 2,
  trailingComma: 'all',
  semi: true,
  singleQuote: true,
  bracketSpacing: true,
  arrowParens: 'always',
  jsxSingleQuote: false,
  bracketSameLine: false,
  endOfLine: 'lf',
  quoteProps: 'as-needed',
  embeddedLanguageFormatting: 'auto',
  plugins: ['prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: ['**/*.{js,jsx,mjs,cjs}'],
      options: {
        printWidth: 100,
        singleQuote: true,
        semi: true,
        trailingComma: 'all',
        bracketSpacing: true,
        arrowParens: 'always',
      },
    },
  ],
};
