import js from '@eslint/js'
import pluginImport from 'eslint-plugin-import'
import pluginReact from 'eslint-plugin-react'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

const CAMEL_CASE_REGEX = /^[a-z][A-Za-z0-9]*$/
const PASCAL_CASE_REGEX = /^[A-Z][A-Za-z0-9]*$/
const SCREAMING_SNAKE_CASE_REGEX = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/
const STATIC_GLOBAL_CONST_TYPES = new Set([
  'ArrayExpression',
  'Literal',
  'ObjectExpression',
  'TemplateLiteral',
])
const SPECIAL_EXPORT_CONST_NAMES = new Set([
  'config',
  'runtime',
  'metadata',
  'viewport',
  'dynamic',
  'dynamicParams',
  'revalidate',
  'fetchCache',
  'preferredRegion',
  'maxDuration',
])
const SPECIAL_EXPORT_FUNCTION_NAMES = new Set([
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
])
function isTopLevelConst(node) {
  const declaration = node.parent
  if (!declaration || declaration.type !== 'VariableDeclaration') return false
  if (declaration.kind !== 'const') return false

  const parent =
    declaration.parent?.type === 'ExportNamedDeclaration'
      ? declaration.parent.parent
      : declaration.parent

  return parent?.type === 'Program'
}

function reportNamingViolation(context, node, expectedStyle) {
  context.report({
    node,
    message: `Identifier "{{name}}" must use ${expectedStyle}.`,
    data: {
      name: node.name,
    },
  })
}

const NAMING_CONVENTION_PLUGIN = {
  rules: {
    convention: {
      meta: {
        type: 'suggestion',
        schema: [],
      },
      create(context) {
        return {
          ClassDeclaration(node) {
            if (!node.id || PASCAL_CASE_REGEX.test(node.id.name)) return
            reportNamingViolation(context, node.id, 'PascalCase')
          },
          FunctionDeclaration(node) {
            if (!node.id) return
            if (SPECIAL_EXPORT_FUNCTION_NAMES.has(node.id.name)) return

            if (PASCAL_CASE_REGEX.test(node.id.name)) {
              return
            }

            if (!CAMEL_CASE_REGEX.test(node.id.name)) {
              reportNamingViolation(context, node.id, 'camelCase')
            }
          },
          VariableDeclarator(node) {
            if (node.id.type !== 'Identifier' || node.id.name === '$') return

            const { name } = node.id
            const { init } = node

            if (!init) return

            if (isTopLevelConst(node) && SPECIAL_EXPORT_CONST_NAMES.has(name)) {
              return
            }

            if (
              init.type === 'ArrowFunctionExpression' ||
              init.type === 'FunctionExpression'
            ) {
              if (PASCAL_CASE_REGEX.test(name)) {
                return
              }

              if (!CAMEL_CASE_REGEX.test(name)) {
                reportNamingViolation(context, node.id, 'camelCase')
              }
              return
            }

            if (init.type === 'ClassExpression') {
              if (!PASCAL_CASE_REGEX.test(name)) {
                reportNamingViolation(context, node.id, 'PascalCase')
              }
              return
            }

            if (
              isTopLevelConst(node) &&
              STATIC_GLOBAL_CONST_TYPES.has(init.type)
            ) {
              if (!SCREAMING_SNAKE_CASE_REGEX.test(name)) {
                reportNamingViolation(context, node.id, 'SCREAMING_SNAKE_CASE')
              }
              return
            }

            if (
              !CAMEL_CASE_REGEX.test(name) &&
              !PASCAL_CASE_REGEX.test(name) &&
              !SCREAMING_SNAKE_CASE_REGEX.test(name)
            ) {
              reportNamingViolation(context, node.id, 'camelCase')
            }
          },
        }
      },
    },
  },
}

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,jsx,tsx,ts}'],
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
    plugins: {
      import: pluginImport,
      local: NAMING_CONVENTION_PLUGIN,
      'react-hooks': pluginReactHooks,
      react: pluginReact,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './jsconfig.json',
        },
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-unresolved': 'error',
      'local/convention': 'error',
      'no-unused-vars': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react/jsx-pascal-case': 'error',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['features/**/*.{js,mjs,cjs,jsx,tsx,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app', '@/app/*'],
              message: 'Features cannot depend on app entrypoints.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['modules/**/*.{js,mjs,cjs,jsx,tsx,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app', '@/app/*'],
              message: 'Modules cannot depend on app entrypoints.',
            },
            {
              group: ['@/features', '@/features/*'],
              message: 'Modules cannot depend on feature layer code.',
            },
            {
              group: ['@/services', '@/services/*'],
              message: 'Modules cannot depend on project service layer code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'modules/nav/item.js',
      'modules/nav/hooks/use-navigation-display.js',
      'modules/nav/hooks/use-navigation-status.js',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app', '@/app/*'],
              message: 'Modules cannot depend on app entrypoints.',
            },
            {
              group: ['@/services', '@/services/*'],
              message: 'Modules cannot depend on project service layer code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['services/**/*.{js,mjs,cjs,jsx,tsx,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app', '@/app/*'],
              message: 'Services cannot depend on app entrypoints.',
            },
            {
              group: ['@/features', '@/features/*'],
              message: 'Services cannot depend on feature layer code.',
            },
            {
              group: ['@/modules', '@/modules/*'],
              message: 'Services cannot depend on module layer code.',
            },
            {
              group: ['@/ui', '@/ui/*'],
              message: 'Services cannot depend on UI layer code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['ui/**/*.{js,mjs,cjs,jsx,tsx,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app', '@/app/*'],
              message: 'UI cannot depend on app entrypoints.',
            },
            {
              group: ['@/features', '@/features/*'],
              message: 'UI cannot depend on feature layer code.',
            },
            {
              group: ['@/modules', '@/modules/*'],
              message: 'UI cannot depend on module layer code.',
            },
            {
              group: ['@/services', '@/services/*'],
              message: 'UI cannot depend on service layer code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['lib/**/*.{js,mjs,cjs,jsx,tsx,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app', '@/app/*'],
              message: 'Lib cannot depend on app entrypoints.',
            },
            {
              group: ['@/features', '@/features/*'],
              message: 'Lib cannot depend on feature layer code.',
            },
            {
              group: ['@/modules', '@/modules/*'],
              message: 'Lib cannot depend on module layer code.',
            },
            {
              group: ['@/services', '@/services/*'],
              message: 'Lib cannot depend on service layer code.',
            },
            {
              group: ['@/ui', '@/ui/*'],
              message: 'Lib cannot depend on UI layer code.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['node_modules/', '.next/', 'out/', 'build/'],
  },
]
