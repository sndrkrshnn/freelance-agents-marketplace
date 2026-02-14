module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:react/jsx-runtime',
    'plugin:security/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-refresh',
    'jsx-a11y',
    'security',
  ],
  rules: {
    // General
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error'],
      },
    ],
    'no-debugger': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-vars': 'off', // Handled by TypeScript

    // TypeScript
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',

    // React
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react/jsx-no-target-blank': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/no-array-index-key': 'warn',
    'react/no-children-prop': 'error',
    'react/no-danger-with-children': 'error',
    'react/no-deprecated': 'warn',
    'react/no-direct-mutation-state': 'error',
    'react/no-unescaped-entities': 'warn',
    'react/no-unknown-property': 'error',
    'react/self-closing-comp': 'warn',
    'react/jsx-curly-brace-presence': [
      'warn',
      {
        props: 'never',
        children: 'never',
      },
    ],

    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // ReactRefresh
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],

    // JSX A11y (Accessibility)
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/label-has-associated-control': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    'jsx-a11y/interactive-supports-focus': 'warn',

    // Security
    'security/detect-eval-with-expression': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-no-csrf-before-method-override': 'off',
    'security/detect-non-literal-require': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: [
    'dist',
    'build',
    'coverage',
    '*.config.js',
    '*.config.ts',
    'node_modules',
    'vite-env.d.ts',
  ],
  overrides: [
    {
      files: ['*.test.tsx', '*.test.ts'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['*.stories.tsx'],
      rules: {
        'react-hooks/rules-of-hooks': 'off',
      },
    },
  ],
}
