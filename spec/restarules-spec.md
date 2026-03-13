# RestaRules Specification

## 1. Front Matter

**Status:** Draft

**Specification Version:** Draft 0.2

**Date:** March 2026

**Author:** James Toole

**Repository:** https://github.com/selfradiance/restarules

### Abstract

RestaRules defines a machine-readable JSON document that restaurants and other hospitality venues can publish to express conduct rules governing automated AI agent interactions. The document is hosted at a well-known URI path (`/.well-known/agent-venue-rules.json`) and covers policies including disclosure requirements, permitted communication channels, rate limits, party size handling, deposit policies, and escalation conditions. This specification describes the document format, field semantics, discovery mechanism, and the decision procedure agents are expected to follow when processing a RestaRules file.

## 2. Introduction

AI agents are increasingly interacting with restaurants — making reservations, calling host stands, modifying bookings, and cancelling on behalf of users. These interactions are growing in volume and variety, but venues currently have no standardized way to communicate their rules and expectations to the agents acting on their behalf or on behalf of diners.

RestaRules addresses this gap. It defines a simple JSON document that a venue publishes at a predictable URL. Any agent — whether a voice assistant, a booking bot, a concierge service, or a search engine — can fetch this document before interacting with the venue and adjust its behavior accordingly.

The protocol is designed to be lightweight, static, and cacheable. A RestaRules file requires no authentication to fetch, no API integration to serve, and no ongoing maintenance beyond updating the file when venue policies change. It follows the same pattern as `robots.txt` — a voluntary, machine-readable policy file hosted at a well-known path — applied to the domain of agentic commerce rather than web crawling.

## 3. Scope

This specification defines:

- The JSON document format for expressing venue conduct rules
- The well-known URI path for hosting the document
- The semantics of each field in the document
- The decision procedure agents should follow when processing the document
- Conformance requirements for agents and venues

This specification does not define:

- Authentication or identity verification mechanisms for agents
- Reservation protocols or booking lifecycle semantics
- Payment processing or financial transactions
- Availability or inventory systems
- Network-level enforcement or bot detection
- Legal compliance requirements (RestaRules is a technical standard, not legal advice)

## 4. Terminology and Conventions

### Key Words

The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", and "MAY" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

### Definitions

**Agent:** An automated software system that interacts with a venue on behalf of a user. This includes voice assistants, booking bots, concierge services, search engines, and any other software that initiates or manages interactions with a venue's staff or reservation systems.

**Venue:** A restaurant or hospitality establishment that publishes a RestaRules file to express its conduct rules for agent interactions.

**Rules File:** The JSON document published by a venue at the well-known URI path `/.well-known/agent-venue-rules.json`. Also referred to as a "RestaRules file" or "rules document."

**Rules Document:** Synonym for Rules File. Both terms are used interchangeably in this specification.

**Schema:** The JSON Schema definition that describes the valid structure of a rules file. The schema is published alongside this specification in the project repository.

**Permission Field:** A field in the rules file that governs whether an agent action is allowed, denied, or requires escalation. Permission fields are subject to the `default_policy` when absent. Examples: `allowed_channels`, `rate_limits`, `party_size_policy`, `deposit_policy`.

**Informational Field:** A field in the rules file that provides information to the agent but MUST NOT block or deny agent actions. Informational fields are not subject to `default_policy` when absent. Examples: `complaint_endpoint`, `cancellation_policy`, `no_show_policy`.

## 5. Discovery and Transport

A venue publishes its rules file at the following well-known URI path, relative to the venue's primary domain:

`/.well-known/agent-venue-rules.json`

For example, a venue at `https://example-restaurant.com` would host its rules file at:

`https://example-restaurant.com/.well-known/agent-venue-rules.json`

### Transport Requirements

Venues MUST serve the rules file over HTTPS. Agents MUST NOT fetch rules files over plain HTTP.

The rules file MUST be served with a Content-Type of `application/json`.

Agents MUST retrieve the rules file using an HTTP GET request. No other HTTP methods are required or expected.

### CORS

Venues SHOULD serve the rules file with the header `Access-Control-Allow-Origin: *` to allow browser-based agents to fetch the file directly. Without this header, browser-based agents (such as web applications or browser extensions) will be blocked by cross-origin restrictions.

### Redirects

Agents MAY follow HTTP redirects (301, 302) when fetching the rules file. If a redirect leads to a non-HTTPS URL, the agent MUST NOT follow it.

### Hosting

The rules file is a static JSON document. It can be hosted on any web server, static hosting provider, or content delivery network capable of serving files at the `/.well-known/` path. No dynamic server logic is required.

Venues that use hosting platforms which do not support the `/.well-known/` path convention (such as some managed website builders) MAY host the file at an alternative URL, but agents are only required to check the well-known path. Alternative hosting locations are outside the scope of this specification.

## 6. Security and Privacy Considerations

### HTTPS Requirement

Rules files MUST be served over HTTPS. This protects against man-in-the-middle attacks where a malicious intermediary could modify venue rules in transit — for example, changing `disclosure_required` to `false` or widening `allowed_channels` to permit unwanted contact methods.

### SSRF Risk

The `complaint_endpoint` field contains a URL provided by the venue. Agents that make HTTP requests to this URL MUST validate the URL before making the request. Agents SHOULD reject URLs that resolve to private or internal network addresses (e.g., `127.0.0.1`, `10.x.x.x`, `192.168.x.x`) to prevent server-side request forgery (SSRF) attacks.

### Agent Identity Spoofing

RestaRules v0.2 does not define a mechanism for verifying agent identity. The `rate_limits` field limits the number of actions an agent may perform within a time window, but the specification does not define how a venue identifies or distinguishes individual agents. A malicious agent could rotate identifiers to circumvent rate limits. Identity verification semantics are deferred to a future version of this specification.

### Denial of Service via Rules Fetching

Agents SHOULD cache rules files to avoid excessive requests to the venue's server. An agent that fetches the rules file before every individual action without caching could place unnecessary load on the venue's infrastructure. See Section 11 (Caching Considerations) for recommended caching behavior.

### Cache Poisoning

If a venue's hosting infrastructure is compromised, an attacker could serve a modified rules file. Agents SHOULD treat rules files as advisory and maintain independent safety constraints. A rules file that permits all actions with no restrictions should be treated with appropriate caution.

### Fake or Malicious Rules Files

A rules file is authored by the venue. Agents SHOULD verify that the rules file is served from the venue's own domain. A rules file served from a third-party domain claiming to represent a venue has no authority and SHOULD be ignored.

## 7. Document Format

A RestaRules file MUST be a JSON object. It MUST NOT be a JSON array, a string, or any other JSON type.

### Required Fields

Every rules file MUST include the following fields:

| Field | Type | Description |
|---|---|---|
| `schema_version` | String | Version of the RestaRules specification. Valid values: `"0.1"`, `"0.2"`. |
| `venue_name` | String | Name of the venue. |
| `venue_url` | String | URL of the venue's website. MUST begin with `https://`. |
| `last_updated` | String | ISO 8601 date when the file was last edited. |
| `effective_at` | String | ISO 8601 date when the rules take effect. |
| `default_policy` | String | How agents should treat optional permission fields that are absent. Valid values: `"deny_if_unspecified"`, `"allow_if_unspecified"`. |
| `disclosure_required` | Object | Whether the agent must identify itself as automated. Contains `enabled` (boolean) and `phrasing` (string). |
| `allowed_channels` | Array | List of communication channels the venue permits. Valid values: `"phone"`, `"web"`, `"sms"`, `"email"`, `"app"`. |

### Optional Fields

The following fields are optional. Their behavior when absent is governed by the `default_policy` field (for permission fields) or is simply omitted from the agent's decision (for informational fields). See Section 8 (Field Semantics) for the classification of each field.

| Field | Type | Classification |
|---|---|---|
| `venue_currency` | String | Metadata |
| `venue_timezone` | String | Metadata |
| `rate_limits` | Array | Permission |
| `human_escalation_required` | Object | Permission |
| `third_party_restrictions` | Object | Permission |
| `party_size_policy` | Object | Permission |
| `deposit_policy` | Object | Permission |
| `user_acknowledgment_requirements` | Array | Permission |
| `complaint_endpoint` | String | Informational |
| `cancellation_policy` | Object | Informational |
| `no_show_policy` | Object | Informational |

### Versioning

The `schema_version` field indicates which version of this specification the rules file conforms to. Agents SHOULD check this field before processing the file.

An agent that encounters a `schema_version` value it does not recognize SHOULD decline to process the file automatically. An unrecognized version means the document structure may have changed in ways the agent cannot safely assume.

This is distinct from unknown fields (see Extensibility below). An unrecognized version applies to the entire document. An unknown field is a single addition within a recognized version.

### Extensibility

Future versions of this specification may introduce additional fields. Agents MUST ignore fields they do not recognize. This ensures forward compatibility — a rules file authored for a newer version of the specification can still be partially processed by agents built for an earlier version, provided the `schema_version` is recognized.

Venues MUST NOT rely on unknown fields being processed by agents. Any field that governs agent behavior must be defined in this specification.

## 8. Field Semantics

### 8.1 Metadata Fields

#### `schema_version`

**Type:** String
**Required:** Yes
**Valid values:** `"0.1"`, `"0.2"`

**Meaning:** Identifies which version of the RestaRules specification this rules file conforms to.

**Agent behavior:** Agents SHOULD check this field before processing any other fields. If the value is not recognized, the agent SHOULD decline to process the file. See Section 7 (Versioning) and Section 10 (Error Handling).

**Absence behavior:** This field is required. A rules file missing `schema_version` MUST fail schema validation.

#### `venue_name`

**Type:** String
**Required:** Yes

**Meaning:** The human-readable name of the venue.

**Agent behavior:** Agents MAY use this field for display or logging purposes. It has no effect on compliance decisions.

**Absence behavior:** This field is required. A rules file missing `venue_name` MUST fail schema validation.

#### `venue_url`

**Type:** String
**Required:** Yes

**Meaning:** The URL of the venue's website. MUST begin with `https://`.

**Agent behavior:** Agents MAY use this field to verify that the rules file is served from the venue's own domain. It has no effect on compliance decisions.

**Absence behavior:** This field is required. A rules file missing `venue_url` MUST fail schema validation.

#### `last_updated`

**Type:** String (ISO 8601 date)
**Required:** Yes

**Meaning:** The date when the rules file was last modified by the venue.

**Agent behavior:** Agents MAY use this field to detect stale rules files or for logging purposes. It has no effect on compliance decisions.

**Absence behavior:** This field is required. A rules file missing `last_updated` MUST fail schema validation.

#### `effective_at`

**Type:** String (ISO 8601 date)
**Required:** Yes

**Meaning:** The date when the rules in this file take effect. This allows a venue to publish updated rules in advance of their enforcement date.

**Agent behavior:** Agents SHOULD compare this date to the current date. If `effective_at` is in the future, agents SHOULD continue using the previously cached rules file until the effective date arrives.

**Absence behavior:** This field is required. A rules file missing `effective_at` MUST fail schema validation.

#### `venue_currency`

**Type:** String (ISO 4217 currency code, e.g., `"USD"`, `"EUR"`, `"GBP"`)
**Required:** No

**Meaning:** The currency used by the venue for monetary values in other fields (such as `deposit_policy` and `cancellation_policy`).

**Agent behavior:** Agents SHOULD use this field to interpret monetary amounts elsewhere in the rules file. It has no effect on compliance decisions.

**Absence behavior:** If absent, agents SHOULD NOT assume a default currency. Monetary amounts in other fields that lack an explicit `currency` sub-field are ambiguous.

#### `venue_timezone`

**Type:** String (IANA timezone identifier, e.g., `"America/New_York"`, `"Europe/London"`)
**Required:** No

**Meaning:** The timezone in which the venue operates.

**Agent behavior:** Agents MAY use this field to interpret time-sensitive rules or for logging purposes. It has no effect on compliance decisions.

**Absence behavior:** If absent, agents SHOULD NOT assume a default timezone.

### 8.2 Permission Fields

Permission fields govern whether an agent action is allowed, denied, or requires escalation. When an optional permission field is absent from the rules file, the `default_policy` field determines the agent's behavior:

- If `default_policy` is `"deny_if_unspecified"`, the agent MUST treat the absent field as a denial.
- If `default_policy` is `"allow_if_unspecified"`, the agent MAY proceed as if the field permits the action.

#### `default_policy`

**Type:** String
**Required:** Yes
**Valid values:** `"deny_if_unspecified"`, `"allow_if_unspecified"`

**Meaning:** Determines how agents should treat optional permission fields that are not present in the rules file. This is the venue's stance on ambiguity — a strict venue denies anything not explicitly permitted; a permissive venue allows anything not explicitly restricted.

**Agent behavior:** Agents MUST apply this policy to every optional permission field that is absent. This field does not apply to informational fields or required fields.

**Absence behavior:** This field is required. A rules file missing `default_policy` MUST fail schema validation.

#### `disclosure_required`

**Type:** Object containing `enabled` (boolean) and `phrasing` (string)
**Required:** Yes

**Meaning:** Specifies whether the agent must disclose its automated nature when interacting with venue staff.

**Agent behavior:** If `enabled` is `true`, the agent MUST identify itself as automated before or during any interaction with the venue. The `phrasing` field provides the venue's preferred disclosure language. Agents SHOULD use the provided phrasing where possible, but MAY use equivalent language if the exact phrasing is impractical for the interaction channel.

**Absence behavior:** This field is required. A rules file missing `disclosure_required` MUST fail schema validation.

#### `allowed_channels`

**Type:** Array of strings
**Required:** Yes
**Valid values:** `"phone"`, `"web"`, `"sms"`, `"email"`, `"app"`

**Meaning:** The communication channels through which the venue permits agent interactions.

**Agent behavior:** Before initiating any interaction, the agent MUST check whether the intended channel is listed in this array. If the channel is not listed, the agent MUST NOT proceed on that channel.

**Absence behavior:** This field is required. A rules file missing `allowed_channels` MUST fail schema validation.

#### `rate_limits`

**Type:** Array of rate limit rule objects
**Required:** No
**Classification:** Permission

**Meaning:** Defines limits on how frequently an agent may perform specific actions. Each rule object contains:

- `action` (string): The action being limited (e.g., `"booking_request"`)
- `limit` (integer): Maximum number of allowed attempts
- `window_value` (integer): The size of the time window
- `window_unit` (string): The unit of the time window (e.g., `"hour"`, `"day"`)
- `applies_to` (array, optional): Specific action types this rule applies to, referencing the shared `action_type` enum (`"check_availability"`, `"create_booking"`, `"modify_booking"`, `"cancel_booking"`)

**Agent behavior:** Agents MUST track their own action counts and respect the limits defined. If an `applies_to` array is present, the rule applies only to the listed action types. If `applies_to` is absent, the rule applies to all actions matching the `action` field.

**Absence behavior:** Subject to `default_policy`.

#### `human_escalation_required`

**Type:** Object containing `conditions` (array of strings)
**Required:** No
**Classification:** Permission
**Valid condition values:** `"reservation_modification"` (additional values may be defined in future versions)

**Meaning:** Specifies conditions under which the agent MUST transfer the interaction to a human rather than proceeding automatically. In v0.2, party-size escalation is handled by `party_size_policy` rather than this field.

**Agent behavior:** If the current interaction matches any listed condition, the agent MUST escalate to a human and MUST NOT proceed with the automated action.

**Absence behavior:** Subject to `default_policy`.

#### `third_party_restrictions`

**Type:** Object containing `no_resale` (boolean), `no_transfer` (boolean), and `identity_bound_booking` (boolean)
**Required:** No
**Classification:** Permission

**Meaning:** Specifies restrictions on third-party involvement in the booking.

- `no_resale`: If `true`, the reservation MUST NOT be resold or listed on secondary markets.
- `no_transfer`: If `true`, the reservation MUST NOT be transferred to a different party.
- `identity_bound_booking`: If `true`, the reservation is bound to the identity of the person who made it and MUST be presented by that person.

**Agent behavior:** Agents acting on behalf of third-party services (resale platforms, concierge services that transfer bookings) MUST check these restrictions before proceeding. If any applicable restriction is `true`, the agent MUST NOT proceed with the restricted action.

**Absence behavior:** Subject to `default_policy`.

#### `party_size_policy`

**Type:** Object containing `auto_book_max` (integer, required), `human_review_above` (integer, optional), and `large_party_channels` (array of strings, optional)
**Required:** No
**Classification:** Permission

**Meaning:** Defines how the venue handles party size in automated bookings.

- `auto_book_max`: The maximum party size an agent may book automatically without human involvement.
- `human_review_above`: If present, party sizes above this number require human review.
- `large_party_channels`: If present, specifies which channels should be used for large party inquiries.

**Agent behavior:** If the requested party size exceeds `auto_book_max`, the agent MUST NOT book automatically and MUST escalate to a human. If `large_party_channels` is provided, the agent SHOULD direct the large party inquiry through one of the listed channels.

**Absence behavior:** Subject to `default_policy`.

**Migration note:** In v0.1, party-size logic was part of `human_escalation_required` via a `party_size_auto_max` sub-field. In v0.2, party-size handling moved to this dedicated field. Both representations cannot coexist in the same rules file.

#### `deposit_policy`

**Type:** Object containing `required` (boolean, required), `amount` (number, optional), `currency` (string, optional), and `refundable` (boolean, optional)
**Required:** No
**Classification:** Permission

**Meaning:** Specifies whether the venue requires a deposit for bookings and, if so, the details.

- `required`: Whether a deposit is required.
- `amount`: The deposit amount.
- `currency`: The currency of the deposit (ISO 4217). If absent, agents SHOULD refer to `venue_currency`.
- `refundable`: Whether the deposit is refundable.

**Agent behavior:** If `required` is `true`, the agent MUST inform the user about the deposit requirement before completing a booking. The agent MUST NOT complete a booking that requires a deposit without the user's acknowledgment.

**Absence behavior:** Subject to `default_policy`.

#### `user_acknowledgment_requirements`

**Type:** Array of strings
**Required:** No
**Classification:** Permission

**Meaning:** A list of policy names that the agent must confirm with the user before proceeding. Each string references a policy area (e.g., `"cancellation_policy"`, `"deposit_policy"`, `"no_show_policy"`).

**Agent behavior:** Before completing an action, the agent MUST present each listed policy to the user and obtain acknowledgment. The agent MUST NOT proceed until the user has acknowledged all listed policies. If a referenced policy name does not correspond to a field present in the rules file, the agent SHOULD handle this gracefully (e.g., inform the user that the venue requires acknowledgment of a policy that is not described in the rules file).

**Absence behavior:** Subject to `default_policy`.

### 8.3 Informational Fields

## 9. Decision Procedure

## 10. Error Handling

## 11. Caching Considerations

## 12. Conformance

### 12.1 Agent Conformance

### 12.2 Venue Conformance

## 13. IANA / Registry Considerations

## 14. Examples

### 14.1 Minimal Example

### 14.2 Full Example
