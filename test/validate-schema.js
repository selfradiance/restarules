const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const schema = require('../schema/agent-venue-rules.schema.json');
const example = require('../schema/agent-venue-rules-example.json');
const partySizeFixture = require('./fixtures/test-venue-with-party-size-policy.json');
const depositFixture = require('./fixtures/test-venue-with-deposit.json');
const cancellationFixture = require('./fixtures/test-venue-with-cancellation.json');
const noShowFixture = require('./fixtures/test-venue-with-no-show.json');
const acknowledgmentFixture = require('./fixtures/test-venue-with-acknowledgment.json');
const scopedRateLimitsFixture = require('./fixtures/test-venue-with-scoped-rate-limits.json');

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

// Test 14: fixture with valid user_acknowledgment_requirements validates
const validAck = validate(acknowledgmentFixture);
if (validAck) {
  console.log('PASS: Fixture with user_acknowledgment_requirements validates against schema.');
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  failed = true;
}

// Test 15: user_acknowledgment_requirements with invalid policy name fails validation
const invalidPolicy = JSON.parse(JSON.stringify(acknowledgmentFixture));
invalidPolicy.user_acknowledgment_requirements = ["fake_policy"];
const validInvalidPolicy = validate(invalidPolicy);
if (!validInvalidPolicy) {
  console.log('PASS: user_acknowledgment_requirements with invalid policy name correctly fails validation.');
} else {
  console.error('FAIL: user_acknowledgment_requirements with invalid policy name should have failed validation.');
  failed = true;
}

// Test 16: user_acknowledgment_requirements with duplicate entries fails validation
const duplicateEntries = JSON.parse(JSON.stringify(acknowledgmentFixture));
duplicateEntries.user_acknowledgment_requirements = ["deposit_policy", "deposit_policy"];
const validDuplicate = validate(duplicateEntries);
if (!validDuplicate) {
  console.log('PASS: user_acknowledgment_requirements with duplicate entries correctly fails validation.');
} else {
  console.error('FAIL: user_acknowledgment_requirements with duplicate entries should have failed validation.');
  failed = true;
}

// Test 17: fixture with applies_to on a rate limit rule passes validation
const validScoped = validate(scopedRateLimitsFixture);
if (validScoped) {
  console.log('PASS: Fixture with scoped applies_to on rate limit rule validates against schema.');
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  failed = true;
}

// Test 18: rate limit rule with invalid action in applies_to fails validation
const invalidAction = JSON.parse(JSON.stringify(scopedRateLimitsFixture));
invalidAction.rate_limits[0].applies_to = ["invalid_action"];
const validInvalidAction = validate(invalidAction);
if (!validInvalidAction) {
  console.log('PASS: rate limit with invalid applies_to action correctly fails validation.');
} else {
  console.error('FAIL: rate limit with invalid applies_to action should have failed validation.');
  failed = true;
}

// Test 19: rate limit rule without applies_to still passes validation (backward compatible)
const noAppliesTo = JSON.parse(JSON.stringify(scopedRateLimitsFixture));
delete noAppliesTo.rate_limits[0].applies_to;
const validNoAppliesTo = validate(noAppliesTo);
if (validNoAppliesTo) {
  console.log('PASS: rate limit without applies_to still validates (backward compatible).');
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  failed = true;
}

// Test 20: valid counting_scope values accepted
const withCountingScope = JSON.parse(JSON.stringify(scopedRateLimitsFixture));
withCountingScope.rate_limits[0].counting_scope = "per_agent";
const validCountingScope = validate(withCountingScope);
if (validCountingScope) {
  // Also spot-check per_user and per_session
  withCountingScope.rate_limits[0].counting_scope = "per_user";
  const validPerUser = validate(withCountingScope);
  withCountingScope.rate_limits[0].counting_scope = "per_session";
  const validPerSession = validate(withCountingScope);
  if (validPerUser && validPerSession) {
    console.log('PASS: All valid counting_scope values (per_agent, per_user, per_session) accepted.');
  } else {
    console.error('FAIL: Some valid counting_scope values were rejected.');
    failed = true;
  }
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  failed = true;
}

// Test 21: invalid counting_scope value rejected
const invalidCountingScope = JSON.parse(JSON.stringify(scopedRateLimitsFixture));
invalidCountingScope.rate_limits[0].counting_scope = "per_ip";
const validInvalidScope = validate(invalidCountingScope);
if (!validInvalidScope) {
  console.log('PASS: Invalid counting_scope value "per_ip" correctly fails validation.');
} else {
  console.error('FAIL: Invalid counting_scope value "per_ip" should have failed validation.');
  failed = true;
}

// Test 22: absent counting_scope is accepted (field is optional, defaults to per_agent)
const noCountingScope = JSON.parse(JSON.stringify(scopedRateLimitsFixture));
delete noCountingScope.rate_limits[0].counting_scope;
const validNoScope = validate(noCountingScope);
if (validNoScope) {
  console.log('PASS: Rate limit without counting_scope still validates (optional field).');
} else {
  for (const error of validate.errors) {
    console.error('FAIL:', error.instancePath, error.message);
  }
  failed = true;
}

if (failed) {
  process.exit(1);
}
