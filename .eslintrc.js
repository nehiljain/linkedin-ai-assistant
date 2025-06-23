module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react', 'react-hooks', '@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier', // Always last!
  ],
  rules: {
    // Add only your project-specific rules here
    'react/react-in-jsx-scope': 'off', // Not needed for React 17+
    'react/prop-types': 'off', // Not needed with TypeScript
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off', // Disabled for Plasmo - console.log is useful for extension debugging
    'no-debugger': 'error',
    'no-unused-vars': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  settings: {
    react: { version: '18.2' },
    'import/resolver': {
      typescript: true,
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/ignore': ['^~'],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      rules: {
        'import/no-unresolved': ['error', { ignore: ['^~'] }],
      },
    },
  ],
  ignorePatterns: [
    'dist',
    'build',
    'build/chrome-mv3-dev/static/background/index.js',
    '.plasmo',
    'node_modules',
  ],
};
