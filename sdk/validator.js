// RestaRules SDK — schema validator
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const schema = require("./schema.json");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function validateRules(rules) {
  const valid = validate(rules);
  return { valid: valid, errors: valid ? null : validate.errors };
}

module.exports = { validateRules };
