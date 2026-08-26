// @soluciona/prettier-config/index.js
// Configuración Prettier unificada

/** @type {import('prettier').Config} */
const config = {
  // Formato
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  rangeStart: 0,
  rangeEnd: Infinity,
  parser: undefined,
  filepath: undefined,
  requirePragma: false,
  insertPragma: false,
  proseWrap: 'always',
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,
  endOfLine: 'lf',
  embeddedLanguageFormatting: 'auto',
  plugins: []
};

export default config;