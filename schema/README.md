# RestaRules Schema

This folder contains the formal schema definition and example files for RestaRules agent venue rules.

## Files

- `agent-venue-rules.schema.json` — The formal JSON Schema definition (Draft 2020-12). This is the source of truth for what a valid rules file looks like. Current version: v0.2.
- `agent-venue-rules-example.json` — A complete example file for a fictional restaurant (The Golden Fork), demonstrating all available fields.

## Schema Version

The current schema version is **0.2**. The `schema_version` field accepts both `"0.1"` and `"0.2"` for backward compatibility.

## Required Fields (8)

- `schema_version` — `"0.1"` or `"0.2"`
- `venue_name` — The restaurant's name
- `venue_url` — The restaurant's website (HTTPS required)
- `last_updated` — When the file was last edited (YYYY-MM-DD)
- `effective_at` — When the rules take effect (YYYY-MM-DD)
- `default_policy` — `"deny_if_unspecified"` or `"allow_if_unspecified"`
- `disclosure_required` — Whether AI agents must identify themselves before interacting
- `allowed_channels` — Which communication channels the venue permits (`phone`, `web`, `sms`, `email`, `app`)

## Optional Fields — Permission (governed by `default_policy`)

These fields control whether an agent action is allowed. When absent, agents consult `default_policy`.

- `rate_limits` — How frequently a single agent may perform specific actions
- `human_escalation_required` — Non-party-size conditions requiring human handoff (e.g., `reservation_modification`)
- `third_party_restrictions` — Rules on resale, transfer, and identity-bound bookings
- `party_size_policy` — Party-size thresholds for auto-booking vs human review (`auto_book_max` required, plus optional `human_review_above` and `large_party_channels`)
- `deposit_policy` — Deposit requirements for reservations (`required` boolean, plus optional `amount`, `currency`, `refundable`)
- `user_acknowledgment_requirements` — Array of policy names the agent must confirm with the user before completing a booking

## Optional Fields — Informational (not governed by `default_policy`)

These fields describe venue terms. Their absence never blocks agent actions.

- `complaint_endpoint` — URL for reporting agent misbehavior
- `cancellation_policy` — Cancellation terms (`penalty_applies` required, plus optional `window_minutes`, `penalty_amount`, `currency`)
- `no_show_policy` — No-show terms (`fee` required, plus optional `currency`, `grace_period_minutes`)

## Optional Fields — Metadata

- `venue_currency` — ISO 4217 currency code (e.g., `"USD"`)
- `venue_timezone` — IANA timezone identifier (e.g., `"America/New_York"`)

## Shared Definitions (`$defs`)

- `action_type` — Enum of agent action types: `check_availability`, `create_booking`, `modify_booking`, `cancel_booking`. Used by `rate_limits[].applies_to` to scope rate limit rules to specific actions.

## Field Classifications

Every optional field is classified as either **permission** or **informational**:

- **Permission fields** govern whether an agent action is allowed. When absent, agents consult `default_policy` to decide.
- **Informational fields** describe venue terms for user awareness. Their absence never blocks actions and is not governed by `default_policy`.

This classification is a core design principle established during schema development.

## How to Validate

You can validate any rules file against the schema using the project's test suite:

```bash
npm install
npm test
```

Or using Python:

```bash
pip install jsonschema
```

```python
import json
from jsonschema import validate, Draft202012Validator

with open("agent-venue-rules.schema.json") as f:
    schema = json.load(f)

with open("your-rules-file.json") as f:
    rules = json.load(f)

validate(instance=rules, schema=schema, cls=Draft202012Validator)
print("Valid!")
```
