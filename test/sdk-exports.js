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

// ============================================================
// Category I: Per-Action Channel Overrides
// ============================================================

const channelOverrideVenue = require("../test/fixtures/test-venue-with-channel-overrides.json");

// I1: create_booking on web → allowed (in per-action override)
const i1 = sdk.evaluateCompliance(channelOverrideVenue, { channel: "web", action: "create_booking" });
assert.strictEqual(i1.channel.result, "ALLOWED", "web should be allowed for create_booking");
assert.strictEqual(i1.channel.source, "per_action_override", "source should be per_action_override");
console.log("PASS: I1 — create_booking on web allowed (in per-action override)");

// I2: create_booking on phone → denied (phone in base but NOT in per-action override)
const i2 = sdk.evaluateCompliance(channelOverrideVenue, { channel: "phone", action: "create_booking" });
assert.strictEqual(i2.channel.result, "DENIED", "phone should be denied for create_booking (not in override)");
assert.strictEqual(i2.channel.source, "per_action_override", "source should be per_action_override");
console.log("PASS: I2 — create_booking on phone denied (full override, not intersection)");

// I3: create_booking on app → allowed (app in override even though NOT in base)
const i3 = sdk.evaluateCompliance(channelOverrideVenue, { channel: "app", action: "create_booking" });
assert.strictEqual(i3.channel.result, "ALLOWED", "app should be allowed for create_booking (in override)");
console.log("PASS: I3 — create_booking on app allowed (full override, not merge)");

// I4: check_availability on phone → allowed (no override, falls back to base)
const i4 = sdk.evaluateCompliance(channelOverrideVenue, { channel: "phone", action: "check_availability" });
assert.strictEqual(i4.channel.result, "ALLOWED", "phone should be allowed for check_availability (base fallback)");
assert.strictEqual(i4.channel.source, "base", "source should be base");
console.log("PASS: I4 — check_availability on phone allowed (falls back to base)");

// I5: modify_booking on any channel → denied (empty array override)
const i5 = sdk.evaluateCompliance(channelOverrideVenue, { channel: "web", action: "modify_booking" });
assert.strictEqual(i5.channel.result, "DENIED", "web should be denied for modify_booking (empty override)");
assert.strictEqual(i5.channel.source, "per_action_override", "source should be per_action_override");
assert.deepStrictEqual(i5.channel.allowedChannels, [], "allowed channels should be empty array");
console.log("PASS: I5 — modify_booking denied on any channel (empty array override)");

// ============================================================
// Category J: Booking Window
// ============================================================

const bookingWindowVenue = require("../test/fixtures/test-venue-with-booking-window.json");

// J1: Booking within window passes (5 hours ahead, min is 2)
const j1 = sdk.evaluateCompliance(bookingWindowVenue, {
  action: "create_booking",
  targetTime: "2026-03-13T17:00:00Z",
  currentTime: "2026-03-13T12:00:00Z",
});
assert.strictEqual(j1.bookingWindow.defined, true, "booking_window should be defined");
assert.strictEqual(j1.bookingWindow.enforced, true, "booking_window should be enforced");
assert.strictEqual(j1.bookingWindow.result, "ALLOWED", "5 hours ahead should be within window");
console.log("PASS: J1 — booking within window passes (5 hours ahead, min is 2)");

// J2: Booking too soon denied (0.5 hours ahead, min is 2)
const j2 = sdk.evaluateCompliance(bookingWindowVenue, {
  action: "create_booking",
  targetTime: "2026-03-13T12:30:00Z",
  currentTime: "2026-03-13T12:00:00Z",
});
assert.strictEqual(j2.bookingWindow.result, "DENIED", "0.5 hours ahead should be denied by min_hours_ahead");
assert.strictEqual(j2.bookingWindow.enforced, true, "should be enforced");
console.log("PASS: J2 — booking too soon denied (0.5 hours ahead, min is 2)");

// J3: Booking too far out denied (60 days ahead, max is 30)
const j3 = sdk.evaluateCompliance(bookingWindowVenue, {
  action: "create_booking",
  targetTime: "2026-05-14T12:00:00Z",
  currentTime: "2026-03-13T12:00:00Z",
});
assert.strictEqual(j3.bookingWindow.result, "DENIED", "60 days ahead should be denied by max_days_ahead");
assert.strictEqual(j3.bookingWindow.enforced, true, "should be enforced");
console.log("PASS: J3 — booking too far out denied (60 days ahead, max is 30)");

// J4: Absent venue_timezone makes booking_window informational only (no denial)
const noTzRules = JSON.parse(JSON.stringify(bookingWindowVenue));
delete noTzRules.venue_timezone;
const j4 = sdk.evaluateCompliance(noTzRules, {
  action: "create_booking",
  targetTime: "2026-03-13T12:30:00Z",
  currentTime: "2026-03-13T12:00:00Z",
});
assert.strictEqual(j4.bookingWindow.defined, true, "booking_window should be defined");
assert.strictEqual(j4.bookingWindow.enforced, false, "should not be enforced without timezone");
assert.strictEqual(j4.bookingWindow.result, "NOT_EVALUATED", "should be NOT_EVALUATED without timezone");
console.log("PASS: J4 — absent venue_timezone makes booking_window informational only");

// J5: Absent booking_window never blocks (default_policy carve-out)
const noBwRules = JSON.parse(JSON.stringify(bookingWindowVenue));
delete noBwRules.booking_window;
noBwRules.default_policy = "deny_if_unspecified";
const j5 = sdk.evaluateCompliance(noBwRules, {
  action: "create_booking",
  targetTime: "2026-03-13T12:30:00Z",
  currentTime: "2026-03-13T12:00:00Z",
});
assert.strictEqual(j5.bookingWindow.defined, false, "booking_window should not be defined");
assert.ok(!j5.bookingWindow.defaultPolicyResult, "absent booking_window should NOT have defaultPolicyResult");
console.log("PASS: J5 — absent booking_window never blocks (default_policy carve-out)");

// J6: Non-create_booking action skips booking window evaluation
const j6 = sdk.evaluateCompliance(bookingWindowVenue, {
  action: "check_availability",
  targetTime: "2026-03-13T12:30:00Z",
  currentTime: "2026-03-13T12:00:00Z",
});
assert.strictEqual(j6.bookingWindow.defined, true, "booking_window should be defined");
assert.strictEqual(j6.bookingWindow.enforced, false, "should not be enforced for check_availability");
assert.strictEqual(j6.bookingWindow.result, "NOT_EVALUATED", "should be NOT_EVALUATED for non-create_booking");
console.log("PASS: J6 — non-create_booking action skips booking window evaluation");

// ============================================================
// Category K: Acknowledgment Semantics (absent policy references)
// ============================================================

// K1: Absent policy reference is skipped gracefully
const ackSkipRules = JSON.parse(JSON.stringify(minimalVenue));
ackSkipRules.user_acknowledgment_requirements = ["deposit_policy"];
// No deposit_policy field exists in minimalVenue
const k1 = sdk.evaluateCompliance(ackSkipRules, { channel: "phone" });
assert.strictEqual(k1.userAcknowledgmentRequirements.defined, true, "ack should be defined");
assert.deepStrictEqual(k1.userAcknowledgmentRequirements.policies, [], "absent deposit_policy should be skipped");
assert.deepStrictEqual(k1.userAcknowledgmentRequirements.skippedPolicies, ["deposit_policy"], "skipped entry should be reported");
console.log("PASS: K1 — absent policy reference is skipped gracefully");

// K2: Skipping does NOT trigger default_policy denial for the absent field
const ackDenyRules = JSON.parse(JSON.stringify(minimalVenue));
ackDenyRules.default_policy = "deny_if_unspecified";
ackDenyRules.user_acknowledgment_requirements = ["deposit_policy"];
const k2 = sdk.evaluateCompliance(ackDenyRules, { channel: "phone" });
assert.strictEqual(k2.userAcknowledgmentRequirements.defined, true, "ack should be defined");
assert.deepStrictEqual(k2.userAcknowledgmentRequirements.policies, [], "absent deposit_policy should be skipped");
// deposit_policy absence is still governed by default_policy independently — the ack skip doesn't cascade
assert.strictEqual(k2.depositPolicy.defined, false, "deposit_policy should still be undefined");
assert.strictEqual(k2.depositPolicy.defaultPolicyResult, "DENIED_DEFAULT_POLICY", "deposit_policy absence governed by default_policy independently");
console.log("PASS: K2 — acknowledgment skip does not cascade into additional default_policy denial");

// L1: Contradictory booking window → non-actionable, not denied, warning present
const contradictoryWindowVenue = JSON.parse(JSON.stringify(fullVenue));
contradictoryWindowVenue.booking_window = { min_hours_ahead: 48, max_days_ahead: 1 };
contradictoryWindowVenue.venue_timezone = "America/New_York";
const l1 = sdk.evaluateCompliance(contradictoryWindowVenue, {
  action: "create_booking",
  targetTime: "2026-03-15T18:00:00-05:00",
  currentTime: "2026-03-14T12:00:00-05:00",
});
assert.strictEqual(l1.bookingWindow.defined, true, "window should be defined");
assert.strictEqual(l1.bookingWindow.enforced, false, "contradictory window should not be enforced");
assert.strictEqual(l1.bookingWindow.result, "NOT_EVALUATED", "result should be NOT_EVALUATED");
assert.ok(l1.bookingWindow.reason.includes("Contradictory"), "reason should mention contradictory");
console.log("PASS: L1 — contradictory booking window treated as non-actionable with warning");

// ============================================================
// Category M: Invalid Input Validation
// ============================================================

// M1: NaN party size returns INVALID_INPUT
const m1 = sdk.evaluateCompliance(fullVenue, { partySize: NaN });
assert.ok(m1.inputError, "NaN partySize should produce inputError");
assert.strictEqual(m1.inputError.result, "INVALID_INPUT", "result should be INVALID_INPUT");
assert.ok(m1.inputError.reason.includes("partySize"), "reason should mention partySize");
console.log("PASS: M1 — NaN party size returns INVALID_INPUT");

// M2: NaN attempt count returns INVALID_INPUT
const m2 = sdk.evaluateCompliance(fullVenue, { action: "booking_request", attempts: NaN });
assert.ok(m2.inputError, "NaN attempts should produce inputError");
assert.strictEqual(m2.inputError.result, "INVALID_INPUT", "result should be INVALID_INPUT");
assert.ok(m2.inputError.reason.includes("attempts"), "reason should mention attempts");
console.log("PASS: M2 — NaN attempt count returns INVALID_INPUT");

// M3: Invalid targetTime string returns INVALID_INPUT
const m3 = sdk.evaluateCompliance(bookingWindowVenue, {
  action: "create_booking",
  targetTime: "not-a-date",
  currentTime: "2026-03-13T12:00:00Z",
});
assert.ok(m3.inputError, "Invalid targetTime should produce inputError");
assert.strictEqual(m3.inputError.result, "INVALID_INPUT", "result should be INVALID_INPUT");
assert.ok(m3.inputError.reason.includes("targetTime"), "reason should mention targetTime");
console.log("PASS: M3 — invalid targetTime string returns INVALID_INPUT");

// M4: Invalid currentTime string returns INVALID_INPUT
const m4 = sdk.evaluateCompliance(bookingWindowVenue, {
  action: "create_booking",
  targetTime: "2026-03-13T17:00:00Z",
  currentTime: "garbage",
});
assert.ok(m4.inputError, "Invalid currentTime should produce inputError");
assert.strictEqual(m4.inputError.result, "INVALID_INPUT", "result should be INVALID_INPUT");
assert.ok(m4.inputError.reason.includes("currentTime"), "reason should mention currentTime");
console.log("PASS: M4 — invalid currentTime string returns INVALID_INPUT");

// M5: Infinity party size returns INVALID_INPUT
const m5 = sdk.evaluateCompliance(fullVenue, { partySize: Infinity });
assert.ok(m5.inputError, "Infinity partySize should produce inputError");
assert.strictEqual(m5.inputError.result, "INVALID_INPUT", "result should be INVALID_INPUT");
console.log("PASS: M5 — Infinity party size returns INVALID_INPUT");

// ============================================================
// Category P: Rate Limit applies_to Enforcement
// ============================================================

const appliesToVenue = require("../test/fixtures/test-venue-with-applies-to-match.json");

// P1: action in applies_to matches the rule (create_booking matches applies_to)
const p1 = sdk.evaluateCompliance(appliesToVenue, { action: "create_booking", attempts: 2 });
assert.strictEqual(p1.rateLimit.result, "WITHIN_LIMITS", "create_booking should match via applies_to");
assert.strictEqual(p1.rateLimit.limit, 5, "limit should be 5");
assert.strictEqual(p1.rateLimit.matchedVia, "applies_to", "should match via applies_to");
console.log("PASS: P1 — action in applies_to matches the rate limit rule");

// P2: action NOT in applies_to does not match (cancel_booking not in applies_to)
const p2 = sdk.evaluateCompliance(appliesToVenue, { action: "cancel_booking", attempts: 1 });
assert.strictEqual(p2.rateLimit.result, "WITHIN_LIMITS_DEFAULT_POLICY", "cancel_booking should not match any rule");
console.log("PASS: P2 — action not in applies_to does not match the rule");

// P3: category label does not match when applies_to is present (booking_request is category, not in applies_to)
const p3 = sdk.evaluateCompliance(appliesToVenue, { action: "booking_request", attempts: 1 });
assert.strictEqual(p3.rateLimit.result, "WITHIN_LIMITS_DEFAULT_POLICY", "booking_request category label should not match when applies_to is present");
console.log("PASS: P3 — category label does not match when applies_to is present");

// P4: rule WITHOUT applies_to still matches on r.action (backward compat)
const p4 = sdk.evaluateCompliance(appliesToVenue, { action: "inquiry", attempts: 3 });
assert.strictEqual(p4.rateLimit.result, "WITHIN_LIMITS", "inquiry should match via action field");
assert.strictEqual(p4.rateLimit.limit, 10, "limit should be 10");
assert.strictEqual(p4.rateLimit.matchedVia, "action", "should match via action");
console.log("PASS: P4 — rule without applies_to still matches on action (backward compat)");

// ============================================================
// Category Q: Timezone-Correct Booking Window
// ============================================================

// Q1: Valid timezone with timezone-qualified times evaluates correctly
const q1 = sdk.evaluateCompliance(bookingWindowVenue, {
  action: "create_booking",
  targetTime: "2026-03-13T17:00:00-05:00",
  currentTime: "2026-03-13T12:00:00-05:00",
});
assert.strictEqual(q1.bookingWindow.defined, true, "booking_window should be defined");
assert.strictEqual(q1.bookingWindow.enforced, true, "booking_window should be enforced");
assert.strictEqual(q1.bookingWindow.result, "ALLOWED", "5 hours ahead should be within window");
console.log("PASS: Q1 — valid timezone with timezone-qualified times evaluates correctly");

// Q2: Invalid timezone string returns NOT_EVALUATED with invalid_venue_timezone reason
const invalidTzVenue = require("../test/fixtures/test-venue-with-invalid-timezone.json");
const q2 = sdk.evaluateCompliance(invalidTzVenue, {
  action: "create_booking",
  targetTime: "2026-04-01T18:00:00Z",
  currentTime: "2026-03-14T12:00:00Z",
});
assert.strictEqual(q2.bookingWindow.defined, true, "booking_window should be defined");
assert.strictEqual(q2.bookingWindow.enforced, false, "should not be enforced with invalid timezone");
assert.strictEqual(q2.bookingWindow.result, "NOT_EVALUATED", "should be NOT_EVALUATED");
assert.ok(q2.bookingWindow.reason.includes("invalid_venue_timezone"), "reason should mention invalid_venue_timezone");
assert.ok(q2.bookingWindow.reason.includes("Not/A/Timezone"), "reason should include the bad timezone value");
console.log("PASS: Q2 — invalid timezone string returns NOT_EVALUATED with invalid_venue_timezone reason");

// Q3: targetTime without timezone offset returns NOT_EVALUATED
const q3 = sdk.evaluateCompliance(bookingWindowVenue, {
  action: "create_booking",
  targetTime: "2026-04-01T18:00:00",
  currentTime: "2026-03-14T12:00:00Z",
});
assert.strictEqual(q3.bookingWindow.defined, true, "booking_window should be defined");
assert.strictEqual(q3.bookingWindow.enforced, false, "should not be enforced without target timezone");
assert.strictEqual(q3.bookingWindow.result, "NOT_EVALUATED", "should be NOT_EVALUATED");
assert.ok(q3.bookingWindow.reason.includes("target_time_missing_timezone"), "reason should mention target_time_missing_timezone");
console.log("PASS: Q3 — targetTime without timezone offset returns NOT_EVALUATED");

// Q4: No currentTime provided with valid venue_timezone — exercises getNowInVenueTimezone path
const q4 = sdk.evaluateCompliance(bookingWindowVenue, {
  action: "create_booking",
  targetTime: "2099-06-01T18:00:00Z",
});
assert.strictEqual(q4.bookingWindow.defined, true, "booking_window should be defined");
assert.strictEqual(q4.bookingWindow.enforced, true, "should be enforced");
// Far future target should be either ALLOWED or DENIED (by max_days_ahead), but should not crash
assert.ok(q4.bookingWindow.result === "ALLOWED" || q4.bookingWindow.result === "DENIED", "should produce a result without error");
console.log("PASS: Q4 — no currentTime provided with valid venue_timezone exercises timezone path without error");

// ============================================================
// Category N: Schema Sync Verification
// ============================================================

// N1: sdk/schema.json matches the canonical schema file
const fs = require("fs");
const path = require("path");
const canonicalSchema = fs.readFileSync(path.join(__dirname, "..", "schema", "agent-venue-rules.schema.json"), "utf8");
const sdkSchema = fs.readFileSync(path.join(__dirname, "..", "sdk", "schema.json"), "utf8");
assert.strictEqual(sdkSchema, canonicalSchema, "sdk/schema.json must match schema/agent-venue-rules.schema.json");
console.log("PASS: N1 — sdk/schema.json matches the canonical schema file");

console.log("\nSDK tests: 47 passed, 0 failed.");
