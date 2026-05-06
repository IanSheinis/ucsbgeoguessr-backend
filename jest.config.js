/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: [
        '<rootDir>/assets/tests',
        // '<rootDir>/backend', // TODO: uncomment once backend tests
    ],
    // Matches any file ending in .test.ts or .spec.ts
    testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
};
