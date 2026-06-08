import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    prettierConfig,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                document:      'readonly',
                window:        'readonly',
                fetch:         'readonly',
                Intl:          'readonly',
                setInterval:   'readonly',
                clearInterval: 'readonly',
            },
        },
        rules: {
            'no-console':    'warn',
            'no-empty':      ['error', { allowEmptyCatch: true }],
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'eqeqeq':        'error',
            'no-var':        'error',
            'prefer-const':  'error',
        },
    },
];
