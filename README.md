# RestaRules — Machine-readable agent conduct rules for restaurants

A JSON schema and hosting standard that lets restaurants publish machine-readable rules for AI agent interactions — covering disclosure requirements, allowed channels, rate limits, human escalation, and anti-resale constraints.

RestaRules defines venue-authored conduct constraints for AI agents. It does not define booking lifecycle semantics, availability, or payment processing — those concerns belong to protocols like AgenticBooking and UCP.

## How It Works

A restaurant publishes a JSON file at `/.well-known/agent-venue-rules.json`. Any AI agent — voice, search, concierge, booking — should fetch this file before interacting with the venue. The file defines what the agent is and isn't allowed to do.

### The `default_policy` Field

Every rules file includes a `default_policy` field set to either `"deny_if_unspecified"` or `"allow_if_unspecified"`. This tells agents how to handle **optional fields that are absent from the file**.

- `"deny_if_unspecified"` — If a rule isn't explicitly included, assume the action is not permitted. This is the conservative default. Most restaurants should use this.
- `"allow_if_unspecified"` — If a rule isn't explicitly included, assume the action is permitted.

**Example — strict venue (deny_if_unspecified):**

```json
{
  "default_policy": "deny_if_unspecified",
  "disclosure_required": { "enabled": true, "phrasing": "I am an AI assistant." },
  "allowed_channels": ["phone"]
}
```

In this file, `rate_limits`, `human_escalation_required`, `third_party_restrictions`, and `complaint_endpoint` are all omitted. Because `default_policy` is `"deny_if_unspecified"`, an agent must treat all of those missing rules as denials.

**Example — permissive venue (allow_if_unspecified):**

```json
{
  "default_policy": "allow_if_unspecified",
  "disclosure_required": { "enabled": false },
  "allowed_channels": ["phone", "web", "app"]
}
```

Here the same four fields are omitted, but `default_policy` is `"allow_if_unspecified"`, so an agent treats the missing rules as permitted.

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

## Security Considerations

RestaRules v0.1 is a conduct standard, not a security product. However, implementers consuming `agent-venue-rules.json` files should be aware of the following:

### Complaint Endpoint Handling

The `complaint_endpoint` field contains a URL supplied by the venue. Agents and consuming systems MUST treat this URL as untrusted input:

- Only follow HTTPS URLs. Reject plain HTTP complaint endpoints.
- Do NOT follow redirects to private IP space (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local addresses (`169.254.0.0/16`), or localhost (`127.0.0.0/8`).
- Do NOT follow redirects that change the scheme from HTTPS to HTTP.
- Set a reasonable timeout on complaint submissions to avoid denial-of-service via slow endpoints.

These precautions mitigate Server-Side Request Forgery (SSRF) risks where a malicious rules file could direct an agent to probe internal networks.

### Rate Limit Identity Semantics

Rate limits in v0.1 are advisory. The schema defines rate limit rules (action type, count, time window) but does NOT define what constitutes an "agent" for counting purposes. Implementers should:

- If the agent declares an identity (e.g., via a User-Agent header or agent ID field), enforce rate limits per declared identity.
- If no agent identity is available, fall back to enforcement per source (IP address, phone number, or session).
- Be aware that agents can rotate identifiers. Rate limits in v0.1 are a signal of venue intent, not a cryptographic enforcement mechanism.

Full identity semantics are planned for v0.2.

## Live Demo

A demo rules file is hosted via GitHub Pages at:

```
https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json
```

This demonstrates the `/.well-known/` hosting pattern using a fictional restaurant (Bella Notte Trattoria). The demo file uses `default_policy: "deny_if_unspecified"` with two optional fields omitted, showing how the default policy governs absent rules in practice.

## Hosting Your Own Rules File

To publish rules for your venue, host a JSON file at `/.well-known/agent-venue-rules.json` on your restaurant's domain. For example, if your website is `https://example-restaurant.com`, the rules file should be fetchable at:

```
https://example-restaurant.com/.well-known/agent-venue-rules.json
```

### Cache-Control Recommendations

Agents will fetch your rules file before interacting with your venue. To balance freshness with performance, set caching headers on the response:

**Recommended for most venues:**

```
Cache-Control: public, max-age=3600
```

This tells agents to cache the file for 1 hour. Rule changes will propagate within an hour of updating the file.

**For venues that change rules frequently (e.g., seasonal hours, event-based policies):**

```
Cache-Control: public, max-age=900
```

A 15-minute cache window. More fetch traffic, but faster propagation.

**For venues that rarely change rules:**

```
Cache-Control: public, max-age=86400
```

A 24-hour cache window. Minimal fetch traffic, but changes take up to a day to propagate.

Agents SHOULD respect standard HTTP caching headers. Agents MUST NOT cache rules files indefinitely — a maximum cache lifetime of 24 hours is recommended even if no `Cache-Control` header is present.

### CORS Headers

If agents will fetch your rules file from browser-based contexts (e.g., a web booking widget), you should also set:

```
Access-Control-Allow-Origin: *
```

This allows any origin to read the file, which is appropriate since rules files are public by design.

### Static Hosting

The rules file is a static JSON file. It can be hosted on any static hosting service (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, or your own web server). No API, no authentication, no server-side logic required — just a fetchable URL returning valid JSON.

## Status

RestaRules is in early development (v0.1). The schema covers disclosure, channels, rate limits, escalation, and third-party restrictions. Deposit policies, cancellation policies, and no-show policies are planned for v0.2.
