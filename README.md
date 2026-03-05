# RestaRules — Machine-readable agent conduct rules for restaurants

A JSON schema and hosting standard that lets restaurants publish machine-readable rules for AI agent interactions — covering disclosure requirements, allowed channels, rate limits, human escalation, and anti-resale constraints.

## How It Works

A restaurant publishes a JSON file at `/.well-known/agent-venue-rules.json`. Any AI agent — voice, search, concierge, booking — should fetch this file before interacting with the venue. The file defines what the agent is and isn't allowed to do.

### The `default_policy` Field

Every rules file includes a `default_policy` field set to either `"deny_if_unspecified"` or `"allow_if_unspecified"`. This tells agents how to handle **optional fields that are absent from the file**.

- `"deny_if_unspecified"` — If a rule isn't explicitly included, assume the action is not permitted. This is the conservative default. Most restaurants should use this.
- `"allow_if_unspecified"` — If a rule isn't explicitly included, assume the action is permitted.

`default_policy` applies only to optional properties defined in this schema version that are omitted entirely. In v0.1, the four optional fields are: `rate_limits`, `human_escalation_required`, `third_party_restrictions`, and `complaint_endpoint`. All other fields are required and must always be present. `default_policy` does not override fields that are present, and it does not apply to invalid or malformed values (which should always be treated as an error).

## Decision Procedure for Agents

When an agent evaluates a venue's rules file, it must follow this procedure:

1. **Validate the file against the schema.** If validation fails, do not proceed. Treat the rules as unreadable.
2. **Check `disclosure_required`.** If `disclosure_required.enabled` is `true`, the agent must identify itself as an AI before making any request. No exceptions.
3. **Check `allowed_channels`.** If the agent's intended channel is not listed in `allowed_channels`, the request is denied.
4. **Check `rate_limits`.** If a rate limit rule applies to the intended action, the agent must respect the limit. If multiple rate limit rules apply, the most restrictive rule applies.
5. **Check `human_escalation_required`.** If the request meets any escalation condition (e.g., party size exceeds the venue's configured maximum party size threshold, or the condition matches a listed trigger), the agent must hand off to a human.
6. **Check `third_party_restrictions`.** If the agent is acting on behalf of a third party and restrictions apply, the request is denied.
7. **For any optional schema-defined rule or constraint that is omitted from the file, apply `default_policy`.** If `default_policy` is `"deny_if_unspecified"`, treat the missing rule as a denial. If `"allow_if_unspecified"`, treat it as permitted.

An agent that follows this procedure can deterministically decide whether a proposed action is allowed before taking it.

## Schema

The schema lives in `schema/`:

- `agent-venue-rules.schema.json` — Formal JSON Schema (Draft 2020-12). This is the source of truth for what a valid rules file looks like.
- `agent-venue-rules-example.json` — A complete example file for a fictional restaurant (The Golden Fork).

## Validation

To run schema validation:

```
npm install
npm test
```

`npm test` uses [Ajv](https://ajv.js.org/) to validate the example file against the schema. Output on success:

```
PASS: Example validates against schema.
```

## Status

RestaRules is in early development (v0.1). The schema covers disclosure, channels, rate limits, escalation, and third-party restrictions. Deposit policies, cancellation policies, and no-show policies are planned for v0.2.
