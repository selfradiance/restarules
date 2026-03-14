# RestaRules — Machine-readable agent conduct rules for restaurants

A JSON schema and hosting standard that lets restaurants publish machine-readable rules for AI agent interactions — covering disclosure requirements, allowed channels, rate limits, human escalation, and anti-resale constraints.

RestaRules defines venue-authored conduct constraints for AI agents. It does not define booking lifecycle semantics, availability, or payment processing — those concerns belong to protocols like AgenticBooking and UCP.

### Specification

The formal RestaRules specification describes the document format, field semantics, discovery mechanism, decision procedure, error handling, and conformance requirements in full detail: [spec/restarules-spec.md](spec/restarules-spec.md)

## How It Works

A restaurant publishes a JSON file at `/.well-known/agent-venue-rules.json`. Any AI agent — voice, search, concierge, booking — should fetch this file before interacting with the venue. The file defines what the agent is and isn't allowed to do.

### Protocol Flow

```
Venue                          Agent
  │                              │
  │  1. Publish rules file at    │
  │     /.well-known/agent-      │
  │     venue-rules.json         │
  │                              │
  │    2. Fetch rules file  ◄────┤
  │                              │
  │                     3. Validate
  │                        against
  │                        schema
  │                              │
  │                     4. Evaluate
  │                        compliance
  │                        (decision
  │                        procedure)
  │                              │
  │                     5. Act (or
  │                        refuse)
  │                              │
```

The venue publishes once; every agent fetches, validates, evaluates, and then either proceeds or refuses — all before taking any action.

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

In this file, many optional fields are omitted. Because `default_policy` is `"deny_if_unspecified"`, an agent must treat all missing **permission fields** as denials (see list below).

**Example — permissive venue (allow_if_unspecified):**

```json
{
  "default_policy": "allow_if_unspecified",
  "disclosure_required": { "enabled": false },
  "allowed_channels": ["phone", "web", "app"]
}
```

Here the same optional fields are omitted, but `default_policy` is `"allow_if_unspecified"`, so an agent treats the missing permission fields as permitted.

`default_policy` applies only to **permission fields** — optional fields that govern whether an agent action is allowed. The permission fields governed by `default_policy` are:

- `rate_limits`
- `human_escalation_required`
- `third_party_restrictions`
- `party_size_policy`
- `deposit_policy`
- `user_acknowledgment_requirements`
- `allowed_channels_by_action`
- `booking_window` (with carve-out: absent booking window never blocks, regardless of `default_policy`)

All required fields must always be present. `default_policy` does not override fields that are present, and it does not apply to invalid or malformed values (which should always be treated as an error).

The following are **informational fields** — they are never governed by `default_policy` and their absence never blocks agent actions:

- `complaint_endpoint` — agents should surface the URL when present so users know where to report misbehavior
- `cancellation_policy` — agents should convey cancellation terms to the user when present
- `no_show_policy` — agents should convey no-show terms to the user when present

`venue_currency` and `venue_timezone` are **metadata fields** — they provide context but are not governed by `default_policy`.

## Decision Procedure for Agents

When an agent evaluates a venue's rules file, it must follow this procedure:

1. **Validate the file against the schema.** If validation fails, do not proceed. Treat the rules as unreadable.
2. **Check `disclosure_required`.** If `disclosure_required.enabled` is `true`, the agent must identify itself as an AI before making any request. No exceptions.
3. **Check channel permissions.** Check `allowed_channels_by_action` first — if a per-action override exists for the current action, use that list (full override). Otherwise, use base `allowed_channels`. If the channel is not in the effective list, deny.
4. **Check `rate_limits`.** If a rate limit rule applies to the intended action, the agent must respect the limit. Use the `counting_scope` field (default: `per_agent`) to determine how attempts are counted. If a rule has an `applies_to` array, it only applies to the listed action types.
5. **Check `human_escalation_required`.** If the request matches a listed escalation condition, the agent must hand off to a human.
6. **Check `party_size_policy`.** If the party size exceeds `auto_book_max`, the agent cannot auto-book. If `human_review_above` is set and the party size exceeds it, escalate to a human. If `large_party_channels` is set, use only the listed channels for large parties.
7. **Check `booking_window`.** If the action is `create_booking` and `booking_window` is present: enforce only when `venue_timezone` is present (otherwise informational only). If `min_hours_ahead` or `max_days_ahead` is violated, deny. Absent booking window never blocks.
8. **Check `deposit_policy`.** If `deposit_policy.required` is `true`, the agent must inform the user about the deposit before proceeding with the booking.
9. **Check `user_acknowledgment_requirements`.** If this array is present, the agent must confirm with the user that they acknowledge each listed policy before completing the booking. Silently skip references to absent policy fields.
10. **Check `third_party_restrictions`.** If the agent is acting on behalf of a third party and restrictions apply, the request is denied.
11. **Surface informational fields.** Provide `cancellation_policy`, `no_show_policy`, and `complaint_endpoint` information to the user when present. These never block actions.

An agent that follows this procedure can deterministically decide whether a proposed action is allowed before taking it.

## Schema

The schema lives in `schema/`:

- `agent-venue-rules.schema.json` — Formal JSON Schema (Draft 2020-12). This is the source of truth for what a valid rules file looks like.
- `agent-venue-rules-example.json` — A complete example file for a fictional restaurant (The Golden Fork).

The project includes two example venues: **The Golden Fork** (`schema/agent-venue-rules-example.json`) is a comprehensive reference example showing all available fields. **Bella Notte Trattoria** (`.well-known/agent-venue-rules.json`) is the live demo — a near-complete v0.3 file served via GitHub Pages at the `/.well-known/` URL.

The schema permits unknown top-level fields for forward compatibility — agents encountering fields from a newer schema version should ignore them rather than rejecting the file.

### Required Fields

| Field | Description |
|---|---|
| `schema_version` | Version string (`"0.1"`, `"0.2"`, or `"0.3"`) |
| `venue_name` | Restaurant name |
| `venue_url` | Restaurant website (HTTPS) |
| `last_updated` | Date the file was last edited |
| `effective_at` | Date the rules take effect |
| `default_policy` | `"deny_if_unspecified"` or `"allow_if_unspecified"` |
| `disclosure_required` | Must AI identify itself? `enabled` (boolean) + `phrasing` (string) |
| `allowed_channels` | Array of permitted channels: `phone`, `web`, `sms`, `email`, `app` |

### Optional Fields — Permission (governed by `default_policy`)

| Field | Description |
|---|---|
| `rate_limits` | Array of rate limit rules. Each rule has `action`, `limit`, `window_unit`, `window_value`, optional `applies_to` (scopes to `$defs.action_type`), and optional `counting_scope` (`per_agent` default, `per_user`, `per_session`) |
| `human_escalation_required` | Non-party-size escalation triggers (e.g., `reservation_modification`) |
| `third_party_restrictions` | `no_resale`, `no_transfer`, `identity_bound_booking` (booleans) |
| `party_size_policy` | `auto_book_max` (required), `human_review_above` (optional), `large_party_channels` (optional) |
| `deposit_policy` | `required` (boolean, required), `amount` (per booking), `currency`, `refundable` |
| `user_acknowledgment_requirements` | Array of policy names (`deposit_policy`, `cancellation_policy`, `no_show_policy`) the agent must confirm with the user |
| `allowed_channels_by_action` | Per-action channel overrides. Each key is an action type, value is a channel array that fully replaces base `allowed_channels` for that action |
| `booking_window` | Booking lead-time constraints: `min_hours_ahead` (number), `max_days_ahead` (number). Applies to `create_booking` only. Absent booking window never blocks regardless of `default_policy` |

### Optional Fields — Informational (not governed by `default_policy`)

| Field | Description |
|---|---|
| `complaint_endpoint` | URL for reporting agent misbehavior |
| `cancellation_policy` | `penalty_applies` (boolean, required), `window_minutes`, `penalty_amount`, `currency` |
| `no_show_policy` | `fee` (number, required), `currency`, `grace_period_minutes` |

### Optional Fields — Metadata

| Field | Description |
|---|---|
| `venue_currency` | ISO 4217 currency code (e.g., `"USD"`) |
| `venue_timezone` | IANA timezone identifier (e.g., `"America/New_York"`) |

### Shared Definitions (`$defs`)

| Definition | Values |
|---|---|
| `action_type` | `check_availability`, `create_booking`, `modify_booking`, `cancel_booking` — used by `rate_limits[].applies_to` and as keys in `allowed_channels_by_action` |

### v0.3 Field Details

#### `counting_scope` (rate limit sub-field)

An optional enum on each rate limit rule declaring how attempts are counted. Values:

- `per_agent` — count attempts per agent identity (default when absent)
- `per_user` — count attempts per end user the agent is acting for
- `per_session` — count attempts per agent session

`per_ip` is explicitly excluded from the enum. When `counting_scope` is absent, agents default to `per_agent`.

#### `allowed_channels_by_action`

An optional top-level object providing per-action channel overrides. Each key is an action type (`check_availability`, `create_booking`, `modify_booking`, `cancel_booking`) and the value is an array of permitted channels.

**Full override semantics:** When a key is present for an action, it completely replaces base `allowed_channels` for that action — it is not an intersection or merge. When a key is absent, base `allowed_channels` applies as the fallback. An empty array (`[]`) means no channel is permitted for that action.

```json
{
  "allowed_channels": ["phone", "web"],
  "allowed_channels_by_action": {
    "create_booking": ["web"],
    "modify_booking": ["phone"]
  }
}
```

In this example, `create_booking` is web-only, `modify_booking` is phone-only, and `check_availability` / `cancel_booking` fall back to base (`phone`, `web`).

#### `booking_window`

An optional top-level object constraining how far ahead or how close to the current time a booking can be made:

- `min_hours_ahead` (number) — minimum lead time in hours (e.g., `2` means bookings must be at least 2 hours in the future)
- `max_days_ahead` (number) — maximum days in advance (e.g., `30` means no bookings more than 30 days out)

**Scope:** Applies to `create_booking` only. Other action types skip booking window evaluation.

**Timezone requirement:** Enforcement requires `venue_timezone` to be present. Without it, the booking window is informational only — the agent surfaces the values but does not enforce them. Agents must pass timezone-qualified ISO 8601 timestamps (e.g., `"2026-03-15T18:00:00-05:00"`) when evaluating booking windows.

**`default_policy` carve-out:** Absent `booking_window` never blocks, regardless of `default_policy`. This is an explicit carve-out — unlike other permission fields, a missing booking window is always treated as "no restriction."

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

## Reference Agent Demo

`reference-agent/agent.js` is a command-line tool that proves the core thesis: an agent can fetch a venue's rules file, validate it against the schema, and change its behavior accordingly — before taking any action.

```bash
# Fetch and display rules
node reference-agent/agent.js https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json

# Check a specific action against the rules
node reference-agent/agent.js https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json \
  --channel phone --party-size 8 --action booking_request --attempts 1
```

Available flags:

| Flag | Description |
|---|---|
| `--channel` | Channel the agent wants to use (e.g., `phone`, `web`, `sms`) |
| `--party-size` | Number of guests — compared against `party_size_policy.auto_book_max` |
| `--action` | Action type for rate limit check (e.g., `booking_request`) |
| `--attempts` | Number of prior attempts — compared against the rate limit |

The agent respects `default_policy`: if a rule isn't defined in the venue's file, the agent treats it as denied (`deny_if_unspecified`) or allowed (`allow_if_unspecified`) based on the venue's declared policy.

## Schema Version Checking

Agents must check the `schema_version` field first when fetching a rules file. If the version is higher than what the agent understands, the agent should hand off to a human rather than guessing at field semantics. There is no separate `min_agent_version` field — `schema_version` serves this purpose. An agent built for v0.1 can safely ignore unknown fields in a v0.2 file, but should not assume it understands all the rules the venue has set.

## Security Considerations

RestaRules is a conduct standard, not a security product. However, implementers consuming `agent-venue-rules.json` files should be aware of the following:

### Complaint Endpoint Handling

The `complaint_endpoint` field contains a URL supplied by the venue. Agents and consuming systems MUST treat this URL as untrusted input:

- Only follow HTTPS URLs. Reject plain HTTP complaint endpoints.
- Do NOT follow redirects to private IP space (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local addresses (`169.254.0.0/16`), or localhost (`127.0.0.0/8`).
- Do NOT follow redirects that change the scheme from HTTPS to HTTP.
- Set a reasonable timeout on complaint submissions to avoid denial-of-service via slow endpoints.

These precautions mitigate Server-Side Request Forgery (SSRF) risks where a malicious rules file could direct an agent to probe internal networks.

### Rate Limit Identity Semantics

Rate limits are advisory. The schema defines rate limit rules (action type, count, time window) but does NOT define what constitutes an "agent" for counting purposes. Implementers should:

- If the agent declares an identity (e.g., via a User-Agent header or agent ID field), enforce rate limits per declared identity.
- If no agent identity is available, fall back to enforcement per source (IP address, phone number, or session).
- Be aware that agents can rotate identifiers. Rate limits are a signal of venue intent, not a cryptographic enforcement mechanism.

v0.3 introduces `counting_scope` to declare how rate limit attempts are counted (`per_agent`, `per_user`, `per_session`), but full identity verification semantics remain deferred to a future version.

## Live Demo

A demo rules file is hosted via GitHub Pages at:

```
https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json
```

This demonstrates the `/.well-known/` hosting pattern using a fictional restaurant (Bella Notte Trattoria). The demo file is a near-complete v0.3 example including all required fields plus `rate_limits` (with `counting_scope`), `human_escalation_required`, `party_size_policy`, `deposit_policy`, `cancellation_policy`, `no_show_policy`, `booking_window`, `user_acknowledgment_requirements`, `complaint_endpoint`, `venue_currency`, and `venue_timezone`. It uses `default_policy: "deny_if_unspecified"` with `third_party_restrictions` and `allowed_channels_by_action` omitted, showing how the default policy governs those absent permission fields.

## Example Ecosystem

The repo includes example rules files from four fictional restaurants, each illustrating a different policy posture. Together they show the range of conduct rules a venue might publish.

| Venue | Default Policy | Channels | Party Size Auto-Book | Deposit | v0.3 Features | Key Feature |
|---|---|---|---|---|---|---|
| Bella Notte Trattoria | `deny_if_unspecified` | phone, web | Up to 4 | $25 refundable | `counting_scope`, `booking_window` | Near-complete v0.3 file with all optional fields except `third_party_restrictions` and `allowed_channels_by_action` |
| The Corner Slice | `allow_if_unspecified` | phone, web, app, sms | Up to 10 | None | — | Minimal rules — even a casual venue benefits from basic boundaries |
| Omakase Sato | `deny_if_unspecified` | web only | Up to 2 | $200 non-refundable | `counting_scope` (per_user), `allowed_channels_by_action`, `booking_window` | Maximum restriction — identity-bound, strict per-action channels, tight booking window |
| Magnolia Garden | `deny_if_unspecified` | phone, web, email | Up to 6 (human review above 8) | $50 refundable | `counting_scope` (per_session), `booking_window` | Event-focused — large-party routing, long booking horizons (48h–180d) |

**File locations:**

- **Bella Notte:** [`.well-known/agent-venue-rules.json`](.well-known/agent-venue-rules.json) (also served live via [GitHub Pages](https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json))
- **The Corner Slice:** [`examples/the-corner-slice.json`](examples/the-corner-slice.json)
- **Omakase Sato:** [`examples/omakase-sato.json`](examples/omakase-sato.json)
- **Magnolia Garden:** [`examples/magnolia-garden.json`](examples/magnolia-garden.json)
- **Golden Fork** (full schema example): [`schema/agent-venue-rules-example.json`](schema/agent-venue-rules-example.json)

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

RestaRules is in active development. Current version: **v0.3**.

**What's built:**
- **v0.3 JSON Schema** (Draft 2020-12) — covers disclosure, channels, rate limits (with counting scope), per-action channel overrides, booking window, human escalation, third-party restrictions, party-size policy, deposit policy, cancellation policy, no-show policy, and user acknowledgment requirements
- **CLI compliance checker** (`cli/check.js`) — validates a rules file and checks agent compliance against all v0.1, v0.2, and v0.3 fields
- **Reference agent** (`reference-agent/`) — fetches a live rules file, validates it, and evaluates compliance for simulated booking scenarios
- **Agent SDK** (`sdk/`) — npm-ready library exporting `validateRules` (JSON Schema validation) and `evaluateCompliance` (full decision engine)
- **Browser voice demo** — live at [selfradiance.github.io/restarules/demo/voice/](https://selfradiance.github.io/restarules/demo/voice/). An agent fetches live venue rules, evaluates compliance, and speaks results aloud using the Web Speech API.
- **107 tests** across schema validation, CLI compliance, reference agent, and SDK
- **CI** via GitHub Actions (runs on every push and PR to main)

## SDK

The `sdk/` directory contains `restarules-sdk`, an npm package that lets developers validate RestaRules files and evaluate agent compliance programmatically. It exports two functions: `validateRules` for JSON Schema validation and `evaluateCompliance` for running the full decision procedure against a proposed action. See [sdk/README.md](sdk/README.md) for full API documentation and usage examples. The SDK is not yet published to npm. To use it locally:

```bash
git clone https://github.com/selfradiance/restarules.git
cd restarules/sdk
npm install
```

Then require it in your project:

```javascript
const { validateRules, evaluateCompliance } = require('./sdk');
```

## Browser Voice Demo

A browser-based demo that proves the RestaRules thesis end-to-end: an AI agent fetches the live Bella Notte rules file from GitHub Pages, evaluates compliance for five booking scenarios using the real SDK, and speaks the results aloud using the Web Speech API. No external accounts, no server hosting — runs entirely in the browser.

**Try it:** [https://selfradiance.github.io/restarules/demo/voice/](https://selfradiance.github.io/restarules/demo/voice/)

The demo includes five scenarios: disclosure check, booking a small party (allowed), booking a large party (escalated to human), deposit and acknowledgment requirements, and cancellation/no-show terms. Each scenario shows a rule trace of which fields the agent evaluated, the triggered rules with actual values from the fetched file, and a plain-English result that can be read aloud by the browser's speech engine.
