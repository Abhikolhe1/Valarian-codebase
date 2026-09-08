module.exports = {
  extends: '@loopback/eslint-config',
  parserOptions: {
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
};
