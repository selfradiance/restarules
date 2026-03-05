const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const schema = require('../schema/agent-venue-rules.schema.json');
const example = require('../schema/agent-venue-rules-example.json');

const ajv = new Ajv();
addFormats(ajv);

const validate = ajv.compile(schema);
const valid = validate(example);

if (valid) {
  console.log('PASS: Example validates against schema.');
  process.exit(0);
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  process.exit(1);
}
