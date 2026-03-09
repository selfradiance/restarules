// RestaRules SDK — entry point
const { validateRules } = require("./validator.js");

module.exports = {
  validateRules: validateRules,
  evaluateCompliance: function (rules, action) {
    throw new Error("Not yet implemented — coming in Step 4");
  },
};
