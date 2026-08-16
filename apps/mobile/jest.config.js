/** @type {import('jest').Config} */

module.exports = {

  preset: 'jest-expo/android',

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  transformIgnorePatterns: [

    'node_modules/(?!\\.pnpm/[^/]+/node_modules/(@react-native/|react-native|expo(nent)?|@expo(nent)?)|((jest-)?react-native|@react-native(-community)?)|@react-native/|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|react-native-google-mobile-ads|@zaban/.*)',

  ],

  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)'],

  moduleNameMapper: {
    '^@zaban/dictionary-languages$': '<rootDir>/../../packages/dictionary-languages/index.js',
  },

};

