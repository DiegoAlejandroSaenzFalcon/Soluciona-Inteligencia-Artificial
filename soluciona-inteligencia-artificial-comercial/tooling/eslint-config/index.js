// @soluciona/eslint-config/index.js
// Entry point - exporta todas las configuraciones

export { baseConfig } from './base.js';
export { reactConfig } from './react.js';
export { nextjsConfig } from './nextjs.js';
export { nodeConfig } from './node.js';

// Default export para uso directo
import baseConfig from './base.js';
export default baseConfig;