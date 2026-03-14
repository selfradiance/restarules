// RestaRules SDK — entry point
const { validateRules } = require("./validator.js");
const { evaluateCompliance, getAggregateVerdict } = require("./evaluator.js");

module.exports = {
  validateRules: validateRules,
  evaluateCompliance: evaluateCompliance,
  getAggregateVerdict: getAggregateVerdict,
};
