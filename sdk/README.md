# restarules-sdk

Validate and evaluate AI agent compliance against RestaRules venue conduct rules.

## What is RestaRules?

RestaRules is an open standard that lets restaurants publish machine-readable conduct rules for AI agents. Restaurants host a JSON file at `/.well-known/agent-venue-rules.json` defining what AI agents are and aren't allowed to do — disclosure requirements, allowed channels, rate limits, party size policies, deposit requirements, and more. This SDK lets developers validate those rules files and evaluate whether a proposed agent action is compliant.

## Install

```
npm install restarules-sdk
```

## Quick Start

```js
const { validateRules, evaluateCompliance } = require("restarules-sdk");

// 1. Validate a rules file
const rules = {
  schema_version: "0.2",
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
  - `action` (string|null) — The action type (e.g., `"booking_request"`, `"create_booking"`)
  - `attempts` (number|null) — Number of attempts the agent has made for this action
- Returns an object with decisions for each rule section:

| Property | Description |
|---|---|
| `disclosure` | `{ required, phrasing }` — whether the agent must identify itself |
| `channel` | `{ result }` — `"ALLOWED"`, `"DENIED"`, or `"NOT_CHECKED"` |
| `partySize` | `{ result, autoMax }` — `"ALLOWED"`, `"ESCALATE_TO_HUMAN"`, `"DENIED_DEFAULT_POLICY"`, or `"NOT_CHECKED"` |
| `escalationConditions` | Array of non-party-size escalation triggers |
| `rateLimit` | `{ result, limit, windowValue, windowUnit, appliesTo }` — `"WITHIN_LIMITS"`, `"EXCEEDED"`, `"DENIED_DEFAULT_POLICY"`, or `"NOT_CHECKED"` |
| `thirdParty` | `{ defined, noResale, noTransfer, identityBound }` or `{ defined: false, defaultPolicyResult }` |
| `complaintEndpoint` | URL string or `null` |
| `venueMetadata` | `{ currency, timezone }` |
| `depositPolicy` | `{ defined, required, amount, currency, refundable }` or `{ defined: false, defaultPolicyResult }` |
| `userAcknowledgmentRequirements` | `{ defined, policies }` or `{ defined: false, defaultPolicyResult }` |
| `cancellationPolicy` | `{ defined, penaltyApplies, windowMinutes, penaltyAmount, currency }` or `{ defined: false }` |
| `noShowPolicy` | `{ defined, fee, currency, gracePeriodMinutes }` or `{ defined: false }` |

Permission fields respect `default_policy` when absent — returning `"DENIED_DEFAULT_POLICY"` or `"ALLOWED"` depending on the venue's setting. Informational fields (`complaintEndpoint`, `cancellationPolicy`, `noShowPolicy`) never block actions.

## Schema Version

This SDK validates against RestaRules schema v0.2. Both v0.1 and v0.2 rules files are accepted.

## Links

- [RestaRules specification](https://github.com/selfradiance/restarules)
- [Live demo rules file](https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json)
- License: MIT
