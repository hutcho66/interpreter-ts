const config = {
  verbose: true,
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'ts', 'd.ts'],
  testEnvironment: 'node',
  collectCoverage: true,
};

export default config;
