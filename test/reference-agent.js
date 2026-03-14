const { evaluateCompliance, getAggregateVerdict } = require("../reference-agent/decisions");
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

// Test 16: applies_to matching — create_booking matches via applies_to
const t16 = evaluateCompliance(goldenFork, { action: "create_booking", attempts: 1 });
assert(
  "create_booking matches rate limit via applies_to with metadata",
  t16.rateLimit.result === "WITHIN_LIMITS" && t16.rateLimit.appliesTo !== null &&
  t16.rateLimit.appliesTo.includes("create_booking") && t16.rateLimit.matchedVia === "applies_to"
);

// Test 17: counting_scope surfaced on rate limit result
const countingScopeRules = require("./fixtures/test-venue-with-counting-scope.json");
const t17 = evaluateCompliance(countingScopeRules, { action: "booking_request", attempts: 1 });
assert(
  "rate limit result includes countingScope per_user when set",
  t17.rateLimit.countingScope === "per_user"
);

// Test 18: absent counting_scope defaults to per_agent in rate limit result
const t18 = evaluateCompliance(countingScopeRules, { action: "inquiry", attempts: 1 });
assert(
  "rate limit result defaults countingScope to per_agent when absent",
  t18.rateLimit.countingScope === "per_agent"
);

// Test 19: per-action channel override uses override channels
const channelOverrideRules = require("./fixtures/test-venue-with-channel-overrides.json");
const t19 = evaluateCompliance(channelOverrideRules, { channel: "app", action: "create_booking" });
assert(
  "per-action override allows app for create_booking (not in base, but in override)",
  t19.channel.result === "ALLOWED" && t19.channel.source === "per_action_override"
);

// Test 20: action without override falls back to base allowed_channels
const t20 = evaluateCompliance(channelOverrideRules, { channel: "phone", action: "check_availability" });
assert(
  "action without override falls back to base allowed_channels",
  t20.channel.result === "ALLOWED" && t20.channel.source === "base"
);

// Test 21: booking within window passes
const bookingWindowRules = require("./fixtures/test-venue-with-booking-window.json");
const t21 = evaluateCompliance(bookingWindowRules, {
  action: "create_booking",
  targetTime: "2026-03-13T17:00:00Z",
  currentTime: "2026-03-13T12:00:00Z",
});
assert(
  "booking within window passes (5 hours ahead, min is 2)",
  t21.bookingWindow.defined === true && t21.bookingWindow.enforced === true && t21.bookingWindow.result === "ALLOWED"
);

// Test 22: booking outside window denied (too soon)
const t22 = evaluateCompliance(bookingWindowRules, {
  action: "create_booking",
  targetTime: "2026-03-13T12:30:00Z",
  currentTime: "2026-03-13T12:00:00Z",
});
assert(
  "booking too soon denied (0.5 hours ahead, min is 2)",
  t22.bookingWindow.defined === true && t22.bookingWindow.enforced === true && t22.bookingWindow.result === "DENIED"
);

// Test 23: absent policy reference in acknowledgments is skipped gracefully
const ackSkipRules = {
  schema_version: "0.2",
  venue_name: "Ack Test Venue",
  venue_url: "https://ack-test.example.com",
  last_updated: "2026-03-13",
  effective_at: "2026-03-13",
  default_policy: "deny_if_unspecified",
  disclosure_required: { enabled: false },
  allowed_channels: ["phone"],
  user_acknowledgment_requirements: ["deposit_policy", "cancellation_policy"],
  cancellation_policy: { penalty_applies: true, window_minutes: 60, penalty_amount: 25 }
  // deposit_policy is intentionally absent
};
const t23 = evaluateCompliance(ackSkipRules);
assert(
  "absent deposit_policy reference skipped, cancellation_policy kept",
  t23.userAcknowledgmentRequirements.defined === true &&
  t23.userAcknowledgmentRequirements.policies.length === 1 &&
  t23.userAcknowledgmentRequirements.policies[0] === "cancellation_policy" &&
  t23.userAcknowledgmentRequirements.skippedPolicies !== null &&
  t23.userAcknowledgmentRequirements.skippedPolicies[0] === "deposit_policy"
);

// Test 24: timezone absent + booking window present → informational only, no denial
const noTzWindowRules = {
  schema_version: "0.3",
  venue_name: "No-TZ Window Bistro",
  venue_url: "https://no-tz-window.example.com",
  last_updated: "2026-03-10",
  effective_at: "2026-03-10",
  default_policy: "deny_if_unspecified",
  disclosure_required: { enabled: false },
  allowed_channels: ["phone"],
  booking_window: { min_hours_ahead: 2, max_days_ahead: 30 }
  // venue_timezone intentionally absent
};
const t24 = evaluateCompliance(noTzWindowRules, {
  action: "create_booking",
  targetTime: "2026-03-10T12:30:00Z",
  currentTime: "2026-03-10T12:00:00Z",
});
assert(
  "timezone absent + booking window → NOT_EVALUATED (informational only)",
  t24.bookingWindow.defined === true && t24.bookingWindow.enforced === false && t24.bookingWindow.result === "NOT_EVALUATED"
);

// Test 25: absent booking window + deny_if_unspecified → no denial (carve-out)
const t25 = evaluateCompliance(rules, {
  action: "create_booking",
  targetTime: "2026-06-01T12:00:00Z",
  currentTime: "2026-03-10T12:00:00Z",
});
assert(
  "absent booking window + deny_if_unspecified → no denial (carve-out)",
  t25.bookingWindow.defined === false
);

// Test 26: booking too far out denied (60 days ahead, max is 30)
const t26 = evaluateCompliance(bookingWindowRules, {
  action: "create_booking",
  targetTime: "2026-05-15T12:00:00Z",
  currentTime: "2026-03-13T12:00:00Z",
});
assert(
  "booking too far out denied (63 days ahead, max is 30)",
  t26.bookingWindow.defined === true && t26.bookingWindow.enforced === true && t26.bookingWindow.result === "DENIED"
);

// Test 27: contradictory booking window → non-actionable, not denied
const contradictoryWindowRules = {
  schema_version: "0.3",
  venue_name: "Contradictory Window Bistro",
  venue_url: "https://contradictory-window.example.com",
  last_updated: "2026-03-10",
  effective_at: "2026-03-10",
  default_policy: "deny_if_unspecified",
  disclosure_required: { enabled: false },
  allowed_channels: ["phone"],
  venue_timezone: "America/New_York",
  booking_window: { min_hours_ahead: 48, max_days_ahead: 1 }
};
const t27 = evaluateCompliance(contradictoryWindowRules, {
  action: "create_booking",
  targetTime: "2026-03-15T18:00:00-05:00",
  currentTime: "2026-03-14T12:00:00-05:00",
});
assert(
  "contradictory booking window → NOT_EVALUATED with warning (non-actionable)",
  t27.bookingWindow.defined === true && t27.bookingWindow.enforced === false &&
  t27.bookingWindow.result === "NOT_EVALUATED" && t27.bookingWindow.reason.includes("Contradictory")
);

// Test 28: large_party_channels does not override per-action channel restriction
const lpConflictRules = require("./fixtures/test-venue-with-large-party-channel-conflict.json");
const t28 = evaluateCompliance(lpConflictRules, { channel: "phone", action: "create_booking", partySize: 6 });
assert(
  "large_party_channels phone denied when per-action override restricts create_booking to web only",
  t28.channel.result === "DENIED" && t28.channel.source === "per_action_override" &&
  t28.partySize.result === "ESCALATE_TO_HUMAN"
);

// Test 29: no party size with party_size_policy present does not crash
const t29_pre = evaluateCompliance(goldenFork, { channel: "phone" });
assert(
  "no party size with party_size_policy present returns NOT_CHECKED without crash",
  t29_pre.partySize && t29_pre.partySize.result === "NOT_CHECKED" && t29_pre.partySize.autoMax !== null
);

// Test 30: NaN party size returns INVALID_INPUT
const t30_inv = evaluateCompliance(rules, { partySize: NaN });
assert(
  "NaN party size returns INVALID_INPUT",
  t30_inv.inputError && t30_inv.inputError.result === "INVALID_INPUT" && t30_inv.inputError.reason.includes("partySize")
);

// Test 31: NaN attempts returns INVALID_INPUT
const t31_inv = evaluateCompliance(rules, { action: "booking_request", attempts: NaN });
assert(
  "NaN attempts returns INVALID_INPUT",
  t31_inv.inputError && t31_inv.inputError.result === "INVALID_INPUT" && t31_inv.inputError.reason.includes("attempts")
);

// Test 32: invalid targetTime returns INVALID_INPUT
const t32_inv = evaluateCompliance(bookingWindowRules, {
  action: "create_booking",
  targetTime: "not-a-date",
  currentTime: "2026-03-13T12:00:00Z",
});
assert(
  "invalid targetTime returns INVALID_INPUT",
  t32_inv.inputError && t32_inv.inputError.result === "INVALID_INPUT" && t32_inv.inputError.reason.includes("targetTime")
);

// Test 33: invalid currentTime returns INVALID_INPUT
const t33_inv = evaluateCompliance(bookingWindowRules, {
  action: "create_booking",
  targetTime: "2026-03-13T17:00:00Z",
  currentTime: "garbage",
});
assert(
  "invalid currentTime returns INVALID_INPUT",
  t33_inv.inputError && t33_inv.inputError.result === "INVALID_INPUT" && t33_inv.inputError.reason.includes("currentTime")
);

// Test 34: applies_to — category label does not match when applies_to is present
const t34 = evaluateCompliance(goldenFork, { action: "booking_request", attempts: 1 });
assert(
  "booking_request category label does not match when applies_to is present",
  t34.rateLimit.result === "DENIED_DEFAULT_POLICY"
);

// Test 35: applies_to — modify_booking also matches via applies_to
const t35 = evaluateCompliance(goldenFork, { action: "modify_booking", attempts: 1 });
assert(
  "modify_booking matches rate limit via applies_to",
  t35.rateLimit.result === "WITHIN_LIMITS" && t35.rateLimit.matchedVia === "applies_to"
);

// Test 36: applies_to — cancel_booking does not match (not in applies_to)
const t36 = evaluateCompliance(goldenFork, { action: "cancel_booking", attempts: 1 });
assert(
  "cancel_booking does not match rate limit (not in applies_to)",
  t36.rateLimit.result === "DENIED_DEFAULT_POLICY"
);

// Test 37: backward compat — rule without applies_to matches on action
const appliesToTestVenue = require("./fixtures/test-venue-with-applies-to-match.json");
const t37 = evaluateCompliance(appliesToTestVenue, { action: "inquiry", attempts: 3 });
assert(
  "inquiry matches rate limit via action field (no applies_to, backward compat)",
  t37.rateLimit.result === "WITHIN_LIMITS" && t37.rateLimit.matchedVia === "action"
);

// Test 38: invalid venue_timezone returns NOT_EVALUATED with reason
const invalidTzVenue = require("./fixtures/test-venue-with-invalid-timezone.json");
const t38 = evaluateCompliance(invalidTzVenue, {
  action: "create_booking",
  targetTime: "2026-04-01T18:00:00Z",
  currentTime: "2026-03-14T12:00:00Z",
});
assert(
  "invalid venue_timezone returns NOT_EVALUATED with invalid_venue_timezone reason",
  t38.bookingWindow.defined === true && t38.bookingWindow.enforced === false &&
  t38.bookingWindow.result === "NOT_EVALUATED" && t38.bookingWindow.reason.includes("invalid_venue_timezone")
);

// Test 39: targetTime without timezone offset returns NOT_EVALUATED
const t39 = evaluateCompliance(bookingWindowRules, {
  action: "create_booking",
  targetTime: "2026-04-01T18:00:00",
  currentTime: "2026-03-14T12:00:00Z",
});
assert(
  "targetTime without timezone offset returns NOT_EVALUATED",
  t39.bookingWindow.defined === true && t39.bookingWindow.enforced === false &&
  t39.bookingWindow.result === "NOT_EVALUATED" && t39.bookingWindow.reason.includes("target_time_missing_timezone")
);

// Test 40: party size advisory — human_review_recommended surfaced
const fullPartySizeVenue = require("./fixtures/test-venue-with-full-party-size.json");
const t40 = evaluateCompliance(fullPartySizeVenue, { partySize: 9 });
assert(
  "party of 9 escalates with human_review_recommended and large_party_channels",
  t40.partySize.result === "ESCALATE_TO_HUMAN" &&
  t40.partySize.humanReviewRecommended === true &&
  t40.partySize.humanReviewAbove === 8 &&
  JSON.stringify(t40.partySize.largePartyChannels) === JSON.stringify(["phone", "email"])
);

// Test 41: party of 4 — no advisory fields
const t41 = evaluateCompliance(fullPartySizeVenue, { partySize: 4 });
assert(
  "party of 4 allowed with no advisory fields",
  t41.partySize.result === "ALLOWED" &&
  t41.partySize.humanReviewRecommended === undefined &&
  t41.partySize.largePartyChannels === undefined
);

// Test 42: getAggregateVerdict — all-ALLOW returns ALLOW
const t42Report = evaluateCompliance(goldenFork, { channel: "phone", partySize: 4 });
const t42v = getAggregateVerdict(t42Report);
assert(
  "aggregate verdict ALLOW for all-pass scenario",
  t42v.verdict === "ALLOW" && t42v.reasons.length === 0
);

// Test 43: getAggregateVerdict — channel DENY returns DENY
const t43Report = evaluateCompliance(goldenFork, { channel: "sms" });
const t43v = getAggregateVerdict(t43Report);
assert(
  "aggregate verdict DENY for denied channel",
  t43v.verdict === "DENY" && t43v.reasons.length > 0
);

// Test 44: getAggregateVerdict — INVALID_INPUT returns INVALID
const t44Report = evaluateCompliance(goldenFork, { partySize: NaN });
const t44v = getAggregateVerdict(t44Report);
assert(
  "aggregate verdict INVALID for invalid input",
  t44v.verdict === "INVALID" && t44v.reasons.length > 0
);

// ============================================================
// Category O: Fetch Hardening (agent.js CLI tests)
// ============================================================

const { spawnSync } = require("child_process");
const path = require("path");
const agentPath = path.join(__dirname, "..", "reference-agent", "agent.js");

function runAgent(urlArg) {
  return spawnSync("node", [agentPath, urlArg], { encoding: "utf8", timeout: 5000 });
}

// O1: HTTP URL rejected (HTTPS required)
const o1 = runAgent("http://example.com/rules.json");
assert(
  "HTTP URL rejected — only HTTPS allowed",
  o1.status !== 0 && o1.stderr.includes("Only HTTPS")
);

// O2: Invalid URL rejected
const o2 = runAgent("not-a-url");
assert(
  "Invalid URL rejected with error message",
  o2.status !== 0 && o2.stderr.includes("Invalid URL")
);

// O3: Missing URL argument exits with error
const o3 = spawnSync("node", [agentPath], { encoding: "utf8", timeout: 5000 });
assert(
  "Missing URL argument exits with usage message",
  o3.status !== 0 && o3.stderr.includes("Usage:")
);

console.log(`\nReference agent tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
