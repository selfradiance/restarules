const { evaluateCompliance } = require("../reference-agent/decisions");
const rules = require("./fixtures/test-venue-rules.json");

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`PASS: ${description}`);
    passed++;
  } else {
    console.error(`FAIL: ${description}`);
    failed++;
  }
}

// Test 1: Disclosure required and phrasing returned
const t1 = evaluateCompliance(rules);
assert(
  "Disclosure is required",
  t1.disclosure.required === true
);
assert(
  "Disclosure phrasing is returned",
  t1.disclosure.phrasing === "I am an AI assistant calling on behalf of a guest."
);

// Test 2: Allowed channel (phone)
const t2 = evaluateCompliance(rules, { channel: "phone" });
assert(
  "Channel 'phone' is ALLOWED",
  t2.channel.result === "ALLOWED"
);

// Test 3: Denied channel (sms)
const t3 = evaluateCompliance(rules, { channel: "sms" });
assert(
  "Channel 'sms' is DENIED",
  t3.channel.result === "DENIED"
);

// Test 4: Party size within auto-max (2 <= 4)
const t4 = evaluateCompliance(rules, { partySize: 2 });
assert(
  "Party size 2 is ALLOWED (auto-max is 4)",
  t4.partySize.result === "ALLOWED"
);

// Test 5: Party size exceeds auto-max (8 > 4)
const t5 = evaluateCompliance(rules, { partySize: 8 });
assert(
  "Party size 8 triggers ESCALATE_TO_HUMAN (auto-max is 4)",
  t5.partySize.result === "ESCALATE_TO_HUMAN"
);

// Test 6: rate_limits not defined — deny_if_unspecified → DENIED_DEFAULT_POLICY
const t6 = evaluateCompliance(rules, { action: "booking_request", attempts: 1 });
assert(
  "rate_limits not defined with deny_if_unspecified → DENIED_DEFAULT_POLICY",
  t6.rateLimit.result === "DENIED_DEFAULT_POLICY"
);

// Test 7: third_party_restrictions not defined — deny_if_unspecified → DENIED_DEFAULT_POLICY
const t7 = evaluateCompliance(rules);
assert(
  "third_party_restrictions not defined with deny_if_unspecified → DENIED_DEFAULT_POLICY",
  t7.thirdParty.defined === false && t7.thirdParty.defaultPolicyResult === "DENIED_DEFAULT_POLICY"
);

console.log(`\nReference agent tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
