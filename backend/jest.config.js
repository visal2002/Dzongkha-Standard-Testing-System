/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: {
    '^@dzongjuk/common$': '<rootDir>/libs/common/src',
    '^@dzongjuk/contracts$': '<rootDir>/libs/contracts/src',
    '^@dzongjuk/security$': '<rootDir>/libs/security/src',
  },
  collectCoverageFrom: ['apps/**/*.ts', 'libs/**/*.ts', '!**/main.ts'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
};
