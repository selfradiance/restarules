// Browser entry point for RestaRules SDK
// This file is bundled by esbuild into bundle.js
const { validateRules, evaluateCompliance } = require("../../sdk/index.js");

window.RestaRulesSDK = {
  validateRules: validateRules,
  evaluateCompliance: evaluateCompliance,
};
