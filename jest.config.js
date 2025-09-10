module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.js',
    '!app/index.js' // Exclude main app file from coverage as it's harder to test in isolation
  ],
  coverageDirectory: 'coverage',
  testMatch: [
    '**/test/**/*.test.js'
  ],
  verbose: true
};