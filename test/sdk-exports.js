const assert = require("assert");

// Verify SDK entry point loads without syntax errors
const sdk = require("../sdk/index.js");

// Load dedicated SDK test fixtures
const fullVenue = require("../test/fixtures/test-sdk-full-venue.json");
const minimalVenue = require("../test/fixtures/test-sdk-minimal-venue.json");

// ============================================================
// Category A: Schema Validation (validateRules)
// ============================================================

// A1: Valid full-venue fixture passes validation
const a1 = sdk.validateRules(fullVenue);
assert.strictEqual(a1.valid, true, "Full venue fixture should be valid");
assert.strictEqual(a1.errors, null, "Valid fixture should have null errors");
console.log("PASS: A1 — valid full-venue fixture passes validation");

// A2: Valid minimal fixture passes validation
const a2 = sdk.validateRules(minimalVenue);
assert.strictEqual(a2.valid, true, "Minimal venue fixture should be valid");
assert.strictEqual(a2.errors, null, "Valid fixture should have null errors");
console.log("PASS: A2 — valid minimal fixture passes validation");

// A3: Empty object fails validation
const a3 = sdk.validateRules({});
assert.strictEqual(a3.valid, false, "Empty object should not be valid");
assert.ok(Array.isArray(a3.errors), "Errors should be an array");
console.log("PASS: A3 — empty object fails validation");

// A4: Missing required field fails validation
const missingName = JSON.parse(JSON.stringify(fullVenue));
delete missingName.venue_name;
const a4 = sdk.validateRules(missingName);
assert.strictEqual(a4.valid, false, "Missing venue_name should fail validation");
assert.ok(Array.isArray(a4.errors), "Errors should be an array");
console.log("PASS: A4 — missing required field (venue_name) fails validation");

// A5: Invalid schema_version fails validation
const badVersion = JSON.parse(JSON.stringify(fullVenue));
badVersion.schema_version = "9.9";
const a5 = sdk.validateRules(badVersion);
assert.strictEqual(a5.valid, false, "Invalid schema_version should fail validation");
assert.ok(Array.isArray(a5.errors), "Errors should be an array");
console.log("PASS: A5 — invalid schema_version fails validation");

// ============================================================
// Category B: Channel Decisions (evaluateCompliance)
// ============================================================

// B1: Allowed channel returns ALLOWED
const b1 = sdk.evaluateCompliance(fullVenue, { channel: "phone" });
assert.strictEqual(b1.channel.result, "ALLOWED", "phone should be allowed");
console.log("PASS: B1 — allowed channel (phone) returns ALLOWED");

// B2: Denied channel returns DENIED
const b2 = sdk.evaluateCompliance(fullVenue, { channel: "sms" });
assert.strictEqual(b2.channel.result, "DENIED", "sms should be denied");
console.log("PASS: B2 — denied channel (sms) returns DENIED");

// ============================================================
// Category C: Party Size Decisions
// ============================================================

// C1: Party size within auto_book_max returns ALLOWED
const c1 = sdk.evaluateCompliance(fullVenue, { partySize: 4 });
assert.strictEqual(c1.partySize.result, "ALLOWED", "Party of 4 should be allowed (auto_book_max is 6)");
assert.strictEqual(c1.partySize.autoMax, 6, "autoMax should be 6");
console.log("PASS: C1 — party size within auto_book_max returns ALLOWED");

// C2: Party size above auto_book_max returns ESCALATE_TO_HUMAN
const c2 = sdk.evaluateCompliance(fullVenue, { partySize: 8 });
assert.strictEqual(c2.partySize.result, "ESCALATE_TO_HUMAN", "Party of 8 should escalate (auto_book_max is 6)");
console.log("PASS: C2 — party size above auto_book_max returns ESCALATE_TO_HUMAN");

// C3: Large party above human_review_above also escalates
const c3 = sdk.evaluateCompliance(fullVenue, { partySize: 12 });
assert.strictEqual(c3.partySize.result, "ESCALATE_TO_HUMAN", "Party of 12 should escalate (above human_review_above: 10)");
console.log("PASS: C3 — large party above human_review_above returns ESCALATE_TO_HUMAN");

// ============================================================
// Category D: Default Policy Behavior
// ============================================================

// D1: Absent permission field with deny_if_unspecified returns DENIED_DEFAULT_POLICY
const denyRules = JSON.parse(JSON.stringify(minimalVenue));
denyRules.default_policy = "deny_if_unspecified";
const d1 = sdk.evaluateCompliance(denyRules, { channel: "phone" });
assert.strictEqual(d1.thirdParty.defined, false, "third_party_restrictions should not be defined");
assert.strictEqual(d1.thirdParty.defaultPolicyResult, "DENIED_DEFAULT_POLICY", "absent permission field should be DENIED_DEFAULT_POLICY");
console.log("PASS: D1 — absent permission field with deny_if_unspecified returns DENIED_DEFAULT_POLICY");

// D2: Absent permission field with allow_if_unspecified returns ALLOWED
const d2 = sdk.evaluateCompliance(minimalVenue, { channel: "phone" });
assert.strictEqual(d2.thirdParty.defined, false, "third_party_restrictions should not be defined");
assert.strictEqual(d2.thirdParty.defaultPolicyResult, "ALLOWED", "absent permission field should be ALLOWED");
console.log("PASS: D2 — absent permission field with allow_if_unspecified returns ALLOWED");

// ============================================================
// Category E: Informational Fields
// ============================================================

// E1: Present informational field returns data with no denial
const e1 = sdk.evaluateCompliance(fullVenue, { channel: "phone" });
assert.strictEqual(e1.complaintEndpoint, "https://sdk-test-bistro.example.com/complaints", "complaint_endpoint should be returned");
assert.strictEqual(e1.cancellationPolicy.defined, true, "cancellation_policy should be defined");
assert.strictEqual(e1.cancellationPolicy.penaltyApplies, true, "penaltyApplies should be true");
console.log("PASS: E1 — present informational fields return data with no denial");

// E2: Absent informational field returns null/defined:false with no denial
const e2 = sdk.evaluateCompliance(minimalVenue, { channel: "phone" });
assert.strictEqual(e2.complaintEndpoint, null, "absent complaint_endpoint should be null");
assert.strictEqual(e2.cancellationPolicy.defined, false, "absent cancellation_policy should have defined: false");
assert.ok(!e2.cancellationPolicy.defaultPolicyResult, "informational field should not have defaultPolicyResult");
console.log("PASS: E2 — absent informational fields return null/defined:false with no denial");

// ============================================================
// Category F: Deposit and Acknowledgment (v0.2 Permission Fields)
// ============================================================

// F1: Present deposit_policy returns deposit details
const f1 = sdk.evaluateCompliance(fullVenue, { channel: "phone" });
assert.strictEqual(f1.depositPolicy.defined, true, "deposit_policy should be defined");
assert.strictEqual(f1.depositPolicy.required, true, "deposit should be required");
assert.strictEqual(f1.depositPolicy.amount, 50, "deposit amount should be 50");
assert.strictEqual(f1.depositPolicy.currency, "USD", "deposit currency should be USD");
assert.strictEqual(f1.depositPolicy.refundable, false, "deposit should not be refundable");
console.log("PASS: F1 — present deposit_policy returns deposit details");

// F2: user_acknowledgment_requirements returns list of policies
const f2 = sdk.evaluateCompliance(fullVenue, { channel: "phone" });
assert.strictEqual(f2.userAcknowledgmentRequirements.defined, true, "user_acknowledgment_requirements should be defined");
assert.deepStrictEqual(f2.userAcknowledgmentRequirements.policies, ["deposit_policy", "cancellation_policy", "no_show_policy"], "should list all 3 policies");
console.log("PASS: F2 — user_acknowledgment_requirements returns list of policies");

// ============================================================
// Category G: Rate Limits
// ============================================================

// G1: Rate limit check with matching action returns limit info
const g1 = sdk.evaluateCompliance(fullVenue, { action: "booking_request", attempts: 2 });
assert.strictEqual(g1.rateLimit.result, "WITHIN_LIMITS", "2 attempts should be within limit of 3");
assert.strictEqual(g1.rateLimit.limit, 3, "limit should be 3");
assert.strictEqual(g1.rateLimit.windowValue, 1, "window_value should be 1");
assert.strictEqual(g1.rateLimit.windowUnit, "hour", "window_unit should be hour");
console.log("PASS: G1 — rate limit check with matching action returns limit info");

// ============================================================
// Category H: Counting Scope
// ============================================================

// H1: Rate limit with counting_scope: "per_user" surfaces in output
const countingScopeVenue = require("../test/fixtures/test-venue-with-counting-scope.json");
const h1 = sdk.evaluateCompliance(countingScopeVenue, { action: "booking_request", attempts: 1 });
assert.strictEqual(h1.rateLimit.countingScope, "per_user", "counting_scope should be per_user");
console.log("PASS: H1 — rate limit with counting_scope per_user surfaces in output");

// H2: Rate limit without counting_scope defaults to "per_agent"
const h2 = sdk.evaluateCompliance(countingScopeVenue, { action: "inquiry", attempts: 1 });
assert.strictEqual(h2.rateLimit.countingScope, "per_agent", "absent counting_scope should default to per_agent");
console.log("PASS: H2 — rate limit without counting_scope defaults to per_agent");

console.log("\nSDK tests: 18 passed, 0 failed.");
