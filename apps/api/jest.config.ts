export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@brain-games/shared(.*)$': '<rootDir>/../../packages/shared/src$1',
    '^@brain-games/game-engine(.*)$': '<rootDir>/../../packages/game-engine/src$1',
  },
};
