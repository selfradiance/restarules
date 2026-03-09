const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const schema = require('../schema/agent-venue-rules.schema.json');
const example = require('../schema/agent-venue-rules-example.json');
const partySizeFixture = require('./fixtures/test-venue-with-party-size-policy.json');

const ajv = new Ajv();
addFormats(ajv);

const validate = ajv.compile(schema);
let failed = false;

// Test 1: existing example validates
const valid = validate(example);
if (valid) {
  console.log('PASS: Example validates against schema.');
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  failed = true;
}

// Test 2: fixture with valid party_size_policy validates
const validPartySize = validate(partySizeFixture);
if (validPartySize) {
  console.log('PASS: Fixture with party_size_policy validates against schema.');
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  failed = true;
}

// Test 3: party_size_policy missing auto_book_max fails validation
const missingAutoBookMax = JSON.parse(JSON.stringify(partySizeFixture));
missingAutoBookMax.party_size_policy = { human_review_above: 8 };
const validMissing = validate(missingAutoBookMax);
if (!validMissing) {
  console.log('PASS: party_size_policy missing auto_book_max correctly fails validation.');
} else {
  console.error('FAIL: party_size_policy missing auto_book_max should have failed validation.');
  failed = true;
}

// Test 4: party_size_policy with auto_book_max: 0 fails validation (minimum is 1)
const zeroAutoBookMax = JSON.parse(JSON.stringify(partySizeFixture));
zeroAutoBookMax.party_size_policy.auto_book_max = 0;
const validZero = validate(zeroAutoBookMax);
if (!validZero) {
  console.log('PASS: party_size_policy with auto_book_max: 0 correctly fails validation.');
} else {
  console.error('FAIL: party_size_policy with auto_book_max: 0 should have failed validation.');
  failed = true;
}

if (failed) {
  process.exit(1);
}
