/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Screen tests render a lot; under a full parallel run 5 s per test was too tight.
  testTimeout: 15000,
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|moti|@legendapp/.*)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo-audio$': '<rootDir>/src/lib/audio/__mocks__/expo-audio.ts',
    '\\.(ogg|mp3|wav|m4a)$': '<rootDir>/src/lib/audio/__mocks__/audio-asset.js',
  },
};
