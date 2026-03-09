// RestaRules SDK — entry point
const { validateRules } = require("./validator.js");
const { evaluateCompliance } = require("./evaluator.js");

module.exports = {
  validateRules: validateRules,
  evaluateCompliance: evaluateCompliance,
};
