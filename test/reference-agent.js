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

// Test 8: missing complaint_endpoint does not produce a DENY verdict
const noComplaintRules = {
  schema_version: "0.1",
  venue_name: "Test Venue",
  venue_url: "https://test-venue.example.com",
  last_updated: "2026-03-05",
  effective_at: "2026-03-05",
  default_policy: "deny_if_unspecified",
  disclosure_required: { enabled: false },
  allowed_channels: ["phone"],
};
const t8 = evaluateCompliance(noComplaintRules, { channel: "phone" });
assert(
  "Missing complaint_endpoint with deny_if_unspecified does not produce DENY (complaintEndpoint is null, channel is ALLOWED)",
  t8.complaintEndpoint === null && t8.channel.result === "ALLOWED"
);

// Test 9: deposit_policy is surfaced when present (permission field)
const depositRules = require("./fixtures/test-venue-with-acknowledgment.json");
const t9 = evaluateCompliance(depositRules, { channel: "phone" });
assert(
  "deposit_policy is surfaced with required=true, amount=50",
  t9.depositPolicy.defined === true && t9.depositPolicy.required === true && t9.depositPolicy.amount === 50
);

// Test 10: deposit_policy absent with deny_if_unspecified → DENIED_DEFAULT_POLICY
const t10 = evaluateCompliance(rules);
assert(
  "deposit_policy absent with deny_if_unspecified → DENIED_DEFAULT_POLICY",
  t10.depositPolicy.defined === false && t10.depositPolicy.defaultPolicyResult === "DENIED_DEFAULT_POLICY"
);

// Test 11: user_acknowledgment_requirements surfaced when present
assert(
  "user_acknowledgment_requirements lists 3 policies",
  t9.userAcknowledgmentRequirements.defined === true && t9.userAcknowledgmentRequirements.policies.length === 3
);

// Test 12: cancellation_policy surfaced as informational (never blocks)
assert(
  "cancellation_policy is surfaced with penaltyApplies=true",
  t9.cancellationPolicy.defined === true && t9.cancellationPolicy.penaltyApplies === true
);

// Test 13: no_show_policy surfaced as informational (never blocks)
assert(
  "no_show_policy is surfaced with fee=100",
  t9.noShowPolicy.defined === true && t9.noShowPolicy.fee === 100
);

// Test 14: cancellation_policy absent does not produce DENY (informational, not permission)
assert(
  "cancellation_policy absent just returns defined=false (no DENIED_DEFAULT_POLICY)",
  t10.cancellationPolicy.defined === false && t10.cancellationPolicy.defaultPolicyResult === undefined
);

// Test 15: venue metadata surfaced when present
const goldenFork = require("../schema/agent-venue-rules-example.json");
const t15 = evaluateCompliance(goldenFork);
assert(
  "venue metadata surfaces currency=USD and timezone=America/New_York",
  t15.venueMetadata.currency === "USD" && t15.venueMetadata.timezone === "America/New_York"
);

// Test 16: applies_to metadata surfaced on rate limit result
const t16 = evaluateCompliance(goldenFork, { action: "booking_request", attempts: 1 });
assert(
  "rate limit result includes appliesTo metadata",
  t16.rateLimit.appliesTo !== null && t16.rateLimit.appliesTo.includes("create_booking")
);

console.log(`\nReference agent tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
