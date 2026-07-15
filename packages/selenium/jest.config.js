/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@testivai/witness$': '<rootDir>/../witness/dist/index.js',
    '^@testivai/witness/(.*)$': '<rootDir>/../witness/dist/$1',
  },
};
