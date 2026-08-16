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
  },
  {
    files: ['core/modules/**/*.{js,mjs,cjs,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/domains/*', '@/app/*', '@/infrastructure/*'],
              message:
                'Core framework modules (core/modules) must remain black-box agnostics and cannot import from domains, app, or infrastructure.',
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
