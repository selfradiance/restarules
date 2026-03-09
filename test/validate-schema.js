const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const schema = require('../schema/agent-venue-rules.schema.json');
const example = require('../schema/agent-venue-rules-example.json');
const partySizeFixture = require('./fixtures/test-venue-with-party-size-policy.json');
const depositFixture = require('./fixtures/test-venue-with-deposit.json');
const cancellationFixture = require('./fixtures/test-venue-with-cancellation.json');
const noShowFixture = require('./fixtures/test-venue-with-no-show.json');

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

// Test 5: fixture with valid deposit_policy validates
const validDeposit = validate(depositFixture);
if (validDeposit) {
  console.log('PASS: Fixture with deposit_policy validates against schema.');
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  failed = true;
}

// Test 6: deposit_policy missing required boolean fails validation
const missingRequired = JSON.parse(JSON.stringify(depositFixture));
missingRequired.deposit_policy = { amount: 25 };
const validMissingReq = validate(missingRequired);
if (!validMissingReq) {
  console.log('PASS: deposit_policy missing required boolean correctly fails validation.');
} else {
  console.error('FAIL: deposit_policy missing required boolean should have failed validation.');
  failed = true;
}

// Test 7: deposit_policy with amount: -5 fails validation (minimum is 0)
const negativeAmount = JSON.parse(JSON.stringify(depositFixture));
negativeAmount.deposit_policy.amount = -5;
const validNegative = validate(negativeAmount);
if (!validNegative) {
  console.log('PASS: deposit_policy with negative amount correctly fails validation.');
} else {
  console.error('FAIL: deposit_policy with negative amount should have failed validation.');
  failed = true;
}

// Test 8: fixture with valid cancellation_policy validates
const validCancellation = validate(cancellationFixture);
if (validCancellation) {
  console.log('PASS: Fixture with cancellation_policy validates against schema.');
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  failed = true;
}

// Test 9: cancellation_policy missing penalty_applies fails validation
const missingPenalty = JSON.parse(JSON.stringify(cancellationFixture));
missingPenalty.cancellation_policy = { window_minutes: 1440 };
const validMissingPenalty = validate(missingPenalty);
if (!validMissingPenalty) {
  console.log('PASS: cancellation_policy missing penalty_applies correctly fails validation.');
} else {
  console.error('FAIL: cancellation_policy missing penalty_applies should have failed validation.');
  failed = true;
}

// Test 10: cancellation_policy with window_minutes: -60 fails validation (minimum is 0)
const negativeWindow = JSON.parse(JSON.stringify(cancellationFixture));
negativeWindow.cancellation_policy.window_minutes = -60;
const validNegativeWindow = validate(negativeWindow);
if (!validNegativeWindow) {
  console.log('PASS: cancellation_policy with negative window_minutes correctly fails validation.');
} else {
  console.error('FAIL: cancellation_policy with negative window_minutes should have failed validation.');
  failed = true;
}

// Test 11: fixture with valid no_show_policy validates
const validNoShow = validate(noShowFixture);
if (validNoShow) {
  console.log('PASS: Fixture with no_show_policy validates against schema.');
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  failed = true;
}

// Test 12: no_show_policy missing fee fails validation
const missingFee = JSON.parse(JSON.stringify(noShowFixture));
missingFee.no_show_policy = { grace_period_minutes: 15 };
const validMissingFee = validate(missingFee);
if (!validMissingFee) {
  console.log('PASS: no_show_policy missing fee correctly fails validation.');
} else {
  console.error('FAIL: no_show_policy missing fee should have failed validation.');
  failed = true;
}

// Test 13: no_show_policy with grace_period_minutes: -10 fails validation (minimum is 0)
const negativeGrace = JSON.parse(JSON.stringify(noShowFixture));
negativeGrace.no_show_policy.grace_period_minutes = -10;
const validNegativeGrace = validate(negativeGrace);
if (!validNegativeGrace) {
  console.log('PASS: no_show_policy with negative grace_period_minutes correctly fails validation.');
} else {
  console.error('FAIL: no_show_policy with negative grace_period_minutes should have failed validation.');
  failed = true;
}

if (failed) {
  process.exit(1);
}
