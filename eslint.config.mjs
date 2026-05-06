import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

export default [
    {
        // When modifying this modify .prettierignore also
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/cdk.out/**',
            '**/.venv/**',
            'backend/out.yaml',
        ],
    },
    js.configs.recommended,
    {
        files: ['**/*.ts'],
        ignores: ['**/*.config.ts'],
        languageOptions: {
            parser: tsParser,
            globals: {
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                global: 'readonly',
                __filename: 'readonly',
                __dirname: 'readonly',
                module: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': ts,
            prettier: prettier,
        },
        rules: {
            eqeqeq: ['error', 'always'],
            'prettier/prettier': 'error',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['**/*.test.ts', '**/*.test.js', '**/jest.config.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                it: 'readonly',
                module: 'readonly',
            },
        },
    },
];
