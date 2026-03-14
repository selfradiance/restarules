// RestaRules SDK — entry point
const { validateRules } = require("./validator.js");
const { evaluateCompliance, getAggregateVerdict, isValidTimezone, hasTimezoneOffset } = require("./evaluator.js");

module.exports = {
  validateRules: validateRules,
  evaluateCompliance: evaluateCompliance,
  getAggregateVerdict: getAggregateVerdict,
  isValidTimezone: isValidTimezone,
  hasTimezoneOffset: hasTimezoneOffset,
};
