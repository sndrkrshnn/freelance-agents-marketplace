module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:security/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['security', 'node'],
  rules: {
    // General
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error', 'log'],
      },
    ],
    'no-debugger': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-vars': 'off', // Will be handled if we add TypeScript
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'quote-props': ['error', 'as-needed'],

    // Security
    'security/detect-eval-with-expression': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-unsafe-regex': 'warn',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-no-csrf-before-method-override': 'off',
    // 'security/detect-express-xmlbodyparser': 'error', // Not available in current plugin version
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'warn',

    // Node.js
    'node/no-unsupported-features/es-syntax': [
      'off',
      {
        ignores: ['modules'],
      },
    ],
    'node/no-missing-import': 'warn',
    'node/no-missing-require': 'warn',
    'node/no-unpublished-require': 'off',
    'node/no-extraneous-require': 'warn',
    'node/prefer-global/buffer': ['error', 'always'],
    'node/prefer-global/console': ['error', 'always'],
    'node/prefer-global/process': ['error', 'always'],
    'node/prefer-global/url-search-params': ['error', 'always'],
    'node/prefer-global/url': ['error', 'always'],
    'node/prefer-promises/dns': 'error',
    'node/prefer-promises/fs': 'warn',

    // Code Style
    'object-shorthand': ['error', 'always'],
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': ['error', 'never'],

    // Best Practices
    'no-shadow': 'warn',
    'no-undef': 'error',
    'valid-typeof': 'error',
    'consistent-return': 'warn',
  },
  settings: {
    node: {
      tryExtensions: ['.js', '.json', '.node'],
    },
  },
  ignorePatterns: [
    'dist',
    'build',
    'coverage',
    '*.config.js',
    'node_modules',
    'migrations',
  ],
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
    },
  ],
}
