import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Globally ignore production compilation artifacts and packages
  { ignores: ['dist', 'node_modules'] },
  {
    // Apply configurations strictly to backend source scripts
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Architectural health rule: prevent dropping async tracking contexts in database pipelines
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      // Safe fallback for TypeScript variables check override
      'no-unused-vars': 'off',
    },
  },
];
