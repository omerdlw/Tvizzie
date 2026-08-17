import globals from 'globals';

export default [
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-undef': 'error',
    },
  },
  {
    files: ['modules/**/*.{js,mjs,cjs,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/domains/account*',
                '@/domains/auth*',
                '@/domains/home*',
                '@/domains/legal*',
                '@/domains/media*',
                '@/domains/reviews*',
                '@/domains/search*',
                '@/domains/social*',
                '@/app*',
                '@/infrastructure*',
              ],
              message:
                'Framework modules (modules/) can import from shell domain (@/domains/shell/*), ui (@/ui/*), and shared (@/shared/*). Feature domains, app, and infrastructure are restricted.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['node_modules/', '.next/', '.open-next/', 'out/', 'build/', '**/*-all.js'],
  },
];
