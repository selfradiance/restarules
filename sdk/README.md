# restarules-sdk

Validate and evaluate AI agent compliance against RestaRules venue conduct rules.

## What is RestaRules?

RestaRules is an open standard that lets restaurants publish machine-readable conduct rules for AI agents. Restaurants host a JSON file at `/.well-known/agent-venue-rules.json` defining what AI agents are and aren't allowed to do — disclosure requirements, allowed channels, rate limits, party size policies, deposit requirements, and more. This SDK lets developers validate those rules files and evaluate whether a proposed agent action is compliant.

## Installation

```bash
npm install restarules-sdk
```

Then use it in your project:

```javascript
const { validateRules, evaluateCompliance } = require('restarules-sdk');
```

## Quick Start

```js
const { validateRules, evaluateCompliance } = require("./path/to/restarules/sdk");

// 1. Validate a rules file
const rules = {
  schema_version: "0.3",
  venue_name: "Example Restaurant",
  venue_url: "https://example.com",
  last_updated: "2026-03-09",
  effective_at: "2026-03-09",
  default_policy: "deny_if_unspecified",
  disclosure_required: { enabled: true, phrasing: "I am an AI assistant." },
  allowed_channels: ["phone", "web"]
};

const validation = validateRules(rules);
console.log(validation.valid);   // true
console.log(validation.errors);  // null

// 2. Evaluate compliance for a proposed action
const decision = evaluateCompliance(rules, {
  channel: "phone",
  partySize: 4,
  action: "booking_request",
  attempts: 1
});

console.log(decision.channel);      // { result: "ALLOWED" }
console.log(decision.disclosure);   // { required: true, phrasing: "I am an AI assistant." }
```

## API Reference

### `validateRules(rules)`

- **rules** (object) — A parsed RestaRules JSON object.
- Returns `{ valid: boolean, errors: array|null }`.
- Uses JSON Schema Draft 2020-12 validation via Ajv.

### `evaluateCompliance(rules, params)`

- **rules** (object) — A validated RestaRules JSON object.
- **params** (object) — The proposed agent action:
  - `channel` (string|null) — The channel the agent intends to use (e.g., `"phone"`, `"web"`, `"sms"`)
  - `partySize` (number|null) — Party size for the booking
  - `action` (string|null) — The action identifier. For rate limit checks, this matches against `rate_limits[].action` (venue-facing labels like `"booking_request"`, `"inquiry"`). For channel checks, this matches against `allowed_channels_by_action` keys (agent-facing action types like `"create_booking"`, `"cancel_booking"`). For booking window checks, must be `"create_booking"` to trigger enforcement. See spec Section 4 (Action Vocabularies) for the full explanation of the two vocabularies.
  - `attempts` (number|null) — Number of attempts the agent has made for this action
  - `targetTime` (string|null) — ISO 8601 datetime of the proposed booking (e.g., `"2026-03-20T19:00:00-05:00"`). Required for `booking_window` enforcement when `action` is `"create_booking"`. MUST be timezone-qualified (with UTC offset or Z suffix) — naive timestamps without timezone offsets produce environment-dependent results and MUST NOT be used
  - `currentTime` (string|null) — ISO 8601 datetime to use as "now" for booking window calculations (e.g., `"2026-03-20T14:00:00-05:00"`). Defaults to the actual current time if omitted. Useful for deterministic testing. MUST be timezone-qualified when provided
- Returns an object with decisions for each rule section:

| Property | Description |
|---|---|
| `disclosure` | `{ required, phrasing }` — whether the agent must identify itself |
| `channel` | `{ result, source, allowedChannels }` — `"ALLOWED"`, `"DENIED"`, or `"NOT_CHECKED"`. `source` is `"per_action_override"` or `"base"` indicating which channel list was used. `allowedChannels` lists the effective channels |
| `partySize` | `{ result, autoMax }` — `"ALLOWED"`, `"ESCALATE_TO_HUMAN"`, `"DENIED_DEFAULT_POLICY"`, or `"NOT_CHECKED"` |
| `escalationConditions` | Array of non-party-size escalation triggers |
| `rateLimit` | `{ result, limit, windowValue, windowUnit, appliesTo, countingScope }` — `"WITHIN_LIMITS"`, `"EXCEEDED"`, `"DENIED_DEFAULT_POLICY"`, or `"NOT_CHECKED"`. `countingScope` is `"per_agent"` (default), `"per_user"`, or `"per_session"` |
| `thirdParty` | `{ defined, noResale, noTransfer, identityBound }` or `{ defined: false, defaultPolicyResult }` |
| `complaintEndpoint` | URL string or `null` |
| `venueMetadata` | `{ currency, timezone }` |
| `depositPolicy` | `{ defined, required, amount, currency, refundable }` or `{ defined: false, defaultPolicyResult }` |
| `userAcknowledgmentRequirements` | `{ defined, policies, skippedPolicies }` or `{ defined: false, defaultPolicyResult }`. `skippedPolicies` lists any policy names that reference absent fields (silently skipped, `null` when none) |
| `cancellationPolicy` | `{ defined, penaltyApplies, windowMinutes, penaltyAmount, currency }` or `{ defined: false }` |
| `noShowPolicy` | `{ defined, fee, currency, gracePeriodMinutes }` or `{ defined: false }` |
| `bookingWindow` | `{ defined, enforced, result, reason, minHoursAhead, maxDaysAhead }` — `result` is `"ALLOWED"`, `"DENIED"`, or `"NOT_EVALUATED"`. `enforced` is `true` only when action is `create_booking`, `targetTime` is provided, and `venue_timezone` is present |

Permission fields respect `default_policy` when absent — returning `"DENIED_DEFAULT_POLICY"` or `"ALLOWED"` depending on the venue's setting. Informational fields (`complaintEndpoint`, `cancellationPolicy`, `noShowPolicy`) never block actions.

### `getAggregateVerdict(report)`

- **report** (object) — The object returned by `evaluateCompliance()`.
- Returns `{ verdict: "ALLOW"|"DENY"|"INVALID", reasons: string[] }`.
- Scans all evaluated fields in the report and computes a single allow/deny/invalid verdict with human-readable reasons for any denial.

```js
const { evaluateCompliance, getAggregateVerdict } = require("restarules-sdk");

const report = evaluateCompliance(rules, params);
const { verdict, reasons } = getAggregateVerdict(report);

console.log(verdict);  // "ALLOW", "DENY", or "INVALID"
console.log(reasons);  // [] or ["channel: DENIED", "rateLimit: EXCEEDED", ...]
```

> **Note:** The aggregate verdict reflects only the fields the SDK can directly evaluate (channels, party size, rate limits, booking window, deposit). Fields that require agent-side enforcement (escalation, acknowledgments, third-party restrictions, disclosure) are reported but do not affect the verdict. Consuming agents must check these fields independently.

## SDK Scope: Evaluation vs. Enforcement

The RestaRules SDK is an **evaluation and reporting** tool. It reads a venue's rules file, validates it against the schema, and tells your agent what the rules require. It does **not** make autonomous allow/deny decisions about things it cannot observe.

**What the SDK does:** Validates rules files. Evaluates channel permissions, party size limits, rate limits, booking windows, and deposit requirements. Reports escalation conditions, acknowledgment requirements, and third-party restrictions. Computes an aggregate verdict based on the fields it can directly evaluate.

**What consuming agents must do:** The SDK surfaces requirements that the agent is responsible for fulfilling:

- `user_acknowledgment_requirements` — the SDK reports which policies need user confirmation. The agent must actually confirm with the user and must not proceed until acknowledgment is received.
- `human_escalation_required` — the SDK reports which conditions trigger escalation. The agent must check whether the current interaction matches a listed condition and escalate accordingly.
- `third_party_restrictions` — the SDK reports active restrictions. The agent must know whether it is acting as a third party and must respect the restrictions.
- `disclosure_required` — the SDK reports the disclosure requirement and phrasing. The agent must actually deliver the disclosure to the human.

This boundary is intentional. The SDK has no visibility into whether a user has acknowledged a policy, whether a human has been contacted for escalation, or whether the calling agent is a third party. Those are runtime decisions that belong to the consuming agent, not to a schema evaluation library.

The spec (Section 9: Agent Conformance) defines the full set of agent obligations. The SDK helps agents meet those obligations; it does not replace them.

## Schema Version

This SDK validates against RestaRules schema v0.3. Rules files with `schema_version` `"0.1"`, `"0.2"`, or `"0.3"` are accepted.

## Links

- [RestaRules specification](https://github.com/selfradiance/restarules)
- [Live demo rules file](https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json)
- License: MIT
