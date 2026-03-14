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

The protocol is designed to be lightweight, static, and cacheable. A RestaRules file requires no authentication to fetch, no API integration to serve, and no ongoing maintenance beyond updating the file when venue policies change. It follows a pattern similar to the `robots.txt` convention defined for web crawlers — a voluntary, machine-readable policy file hosted at a well-known path — applied to the domain of agentic commerce rather than content crawling.

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

**Escalation:** Transferring an interaction to a human operator or directing the user to a human-managed communication channel. When this specification requires an agent to escalate, the agent MUST cease automated processing of the action and ensure a human is involved before the interaction proceeds.

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
| `last_updated` | String | ISO 8601 calendar date (YYYY-MM-DD) when the file was last edited. |
| `effective_at` | String | ISO 8601 calendar date (YYYY-MM-DD) when the rules take effect. |
| `default_policy` | String | How agents should treat optional permission fields that are absent. Valid values: `"deny_if_unspecified"`, `"allow_if_unspecified"`. |
| `disclosure_required` | Object | Whether the agent must identify itself as automated. Contains `enabled` (boolean) and `phrasing` (string). |
| `allowed_channels` | Array | List of communication channels the venue permits. Valid values: `"phone"`, `"web"`, `"sms"`, `"email"`, `"app"`. |

### Optional Fields

The following fields are optional. Their behavior when absent is governed by the `default_policy` field (for permission fields) or is simply omitted from the agent's decision (for informational fields). See Section 8 (Field Semantics) for the classification of each field.

| Field | Type | Classification |
|---|---|---|
| `venue_currency` | String | Metadata |
| `venue_timezone` | String | Metadata |
| `allowed_channels_by_action` | Object | Permission |
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

An agent that encounters a `schema_version` value it does not recognize MUST NOT process the file. An unrecognized version means the document structure may have changed in ways the agent cannot safely assume.

Agents MUST support `schema_version` `"0.2"`. Support for earlier versions (such as `"0.1"`) is OPTIONAL.

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

**Agent behavior:** Agents SHOULD check this field before processing any other fields. If the value is not recognized, the agent MUST NOT process the file. See Section 7 (Versioning) and Section 10 (Error Handling).

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

**Type:** String (ISO 8601 calendar date, YYYY-MM-DD)
**Required:** Yes

**Meaning:** The date when the rules file was last modified by the venue.

**Agent behavior:** Agents MAY use this field to detect stale rules files or for logging purposes. It has no effect on compliance decisions.

**Absence behavior:** This field is required. A rules file missing `last_updated` MUST fail schema validation.

#### `effective_at`

**Type:** String (ISO 8601 calendar date, YYYY-MM-DD)
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
- If `default_policy` is `"allow_if_unspecified"`, the agent MUST treat the absent field as permitting the action.

When `default_policy` results in a denial for an absent permission field, the agent MUST NOT perform the action governed by that field without first escalating to a human. The denial means the venue has not granted permission for that category of behavior — it does not imply a specific restrictive value (e.g., a denial for absent `rate_limits` does not mean zero attempts are allowed; it means the agent must not proceed without human guidance on rate limiting).

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

**Agent behavior:** If `enabled` is `true`, the agent MUST disclose its automated nature at the beginning of the interaction, before initiating substantive communication with the venue. The `phrasing` field provides the venue's preferred disclosure language. Agents SHOULD use the provided phrasing where possible, but MAY use equivalent language if the exact phrasing is impractical for the interaction channel.

**Absence behavior:** This field is required. A rules file missing `disclosure_required` MUST fail schema validation.

#### `allowed_channels`

**Type:** Array of strings
**Required:** Yes
**Valid values:** `"phone"`, `"web"`, `"sms"`, `"email"`, `"app"`

Channel definitions: `"phone"` refers to voice calls to the venue. `"web"` refers to interactions through the venue's website or web-based booking interface. `"sms"` refers to text messages sent to the venue. `"email"` refers to email sent to the venue. `"app"` refers to interactions through the venue's own mobile application or a third-party booking application.

**Meaning:** The communication channels through which the venue permits agent interactions.

**Agent behavior:** Before initiating any interaction, the agent MUST check whether the intended channel is listed in this array. If the channel is not listed, the agent MUST NOT proceed on that channel.

**Absence behavior:** This field is required. A rules file missing `allowed_channels` MUST fail schema validation.

#### `allowed_channels_by_action`

**Type:** Object
**Required:** No
**Classification:** Permission

**Meaning:** Per-action channel overrides. Each key is an action type from the shared `action_type` vocabulary (`"check_availability"`, `"create_booking"`, `"modify_booking"`, `"cancel_booking"`). Each value is an array of permitted channel strings (`"phone"`, `"web"`, `"sms"`, `"email"`, `"app"`).

When `allowed_channels_by_action` contains a key matching the agent's current action, the agent MUST use the channel list from that key and MUST NOT fall back to base `allowed_channels`. This is a full override, not an intersection or merge. A channel that appears in `allowed_channels_by_action` for a given action is permitted for that action even if it does not appear in base `allowed_channels`. Conversely, a channel that appears in base `allowed_channels` but not in the per-action override is not permitted for that action.

When `allowed_channels_by_action` does not contain a key for the current action, or when the field is absent entirely, the agent MUST use base `allowed_channels`.

An empty array for an action key (e.g., `"modify_booking": []`) means no channel is permitted for that action. Agents MUST treat this as a channel denial for that action.

**Agent behavior:** Before initiating any interaction, the agent MUST determine the effective channel list for the current action by checking `allowed_channels_by_action` first. If a matching key exists, the agent MUST use that list. Otherwise, the agent MUST use base `allowed_channels`. If the intended channel is not in the effective list, the agent MUST deny the action.

**Absence behavior:** When `allowed_channels_by_action` is absent, base `allowed_channels` governs all actions. Because `allowed_channels` is a required field, the absence of `allowed_channels_by_action` does not create ambiguity — `default_policy` does not apply to this field at the top level. At the per-action key level, if a venue defines `allowed_channels_by_action` but omits a key for a specific action, that action falls back to base `allowed_channels` regardless of `default_policy`.

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
- `counting_scope` (string, optional): Declares the scope for counting rate limit attempts against this rule. Valid values: `"per_agent"`, `"per_user"`, `"per_session"`. If absent, agents MUST treat the rule as `"per_agent"`.

The `action` field is a venue-defined label that identifies the conceptual category of the rate limit rule (e.g., `"booking_request"`). The `applies_to` field, when present, is the authoritative field for action-type matching — it restricts the rule to specific action types from the shared `action_type` vocabulary. If `applies_to` is absent, the agent MAY treat the rule as applying to all supported action types. The `action` field is always required; `applies_to` is an optional refinement.

The `counting_scope` field declares how the venue intends rate limit attempts to be counted:

- `"per_agent"`: Attempts are counted per the stable declared agent identity presented to the venue. This is the default when `counting_scope` is absent.
- `"per_user"`: Attempts are counted per the end user the agent is acting on behalf of.
- `"per_session"`: Attempts are counted per interaction session.

The value `"per_ip"` is explicitly excluded. IP-based counting is a transport-layer concern — NAT, proxies, and cloud infrastructure make IP addresses unreliable for agent or user identity. Rate limit counting scope is a conduct-layer declaration.

If a venue has no mechanism for identifying agents or users at the declared scope, the venue MAY fall back to request-source heuristics (e.g., IP address, API key). This fallback is an implementation detail and is not specified by this document.

**Agent behavior:** Agents MUST track their own action counts and respect the limits defined. If an `applies_to` array is present, the rule applies only to the listed action types. If `applies_to` is absent, the rule applies to all actions matching the `action` field. When `counting_scope` is absent from a rate limit rule, agents MUST treat the rule as `"per_agent"`. Agents SHOULD enforce rate limits using the identifier appropriate to the declared scope — their own agent identity for `"per_agent"`, the end user's identity for `"per_user"`, or the current session identifier for `"per_session"`.

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

**Agent behavior:** `no_resale` and `no_transfer` apply to `create_booking` and `modify_booking` actions. If either restriction is `true`, the agent MUST NOT create or modify bookings on behalf of resale platforms or transfer services. `identity_bound_booking` applies to all action types — if `true`, the agent MUST obtain an explicit representation from the user that the booking is for the actual diner and not for transfer or resale. Agents acting on behalf of third-party services MUST check these restrictions before proceeding.

**Absence behavior:** Subject to `default_policy`.

#### `party_size_policy`

**Type:** Object containing `auto_book_max` (integer, required), `human_review_above` (integer, optional), and `large_party_channels` (array of strings, optional)
**Required:** No
**Classification:** Permission

**Meaning:** Defines how the venue handles party size in automated bookings.

- `auto_book_max`: The maximum party size an agent may book automatically without human involvement.
- `human_review_above`: If present, party sizes above this number require human review.
- `large_party_channels`: If present, specifies which channels should be used for large party inquiries.

**Agent behavior:** If the requested party size exceeds `auto_book_max`, the agent MUST NOT book automatically and MUST escalate to a human. This applies to all party sizes above `auto_book_max`, regardless of whether `human_review_above` is also defined. The `human_review_above` field, when present, indicates a higher threshold above which the venue considers the party especially large and may apply additional review. If `large_party_channels` is provided, the agent SHOULD direct the large party inquiry through one of the listed channels.

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

**Agent behavior:** If `required` is `true`, the agent MUST inform the user about the deposit requirement before completing a booking. The agent MUST NOT complete a booking that requires a deposit without the user's acknowledgment. Agents SHOULD interpret monetary values as fixed-precision decimal amounts in the currency specified by the `currency` sub-field or, if absent, by `venue_currency`.

**Absence behavior:** Subject to `default_policy`.

#### `user_acknowledgment_requirements`

**Type:** Array of strings
**Required:** No
**Classification:** Permission

**Meaning:** A list of policy names that the agent must confirm with the user before proceeding. Each string MUST exactly match the JSON key of the corresponding field in the rules file (e.g., `"cancellation_policy"`, `"deposit_policy"`, `"no_show_policy"`).

**Agent behavior:** Before completing an action, the agent MUST present each listed policy to the user and obtain acknowledgment. The agent MUST NOT proceed until the user has acknowledged all listed policies. If a referenced policy name does not correspond to a field present in the rules file, the agent MUST inform the user that acknowledgment is required for a policy whose details were not provided in the rules file. The agent MAY continue only if the user explicitly acknowledges that the policy details are unavailable.

**Absence behavior:** Subject to `default_policy`.

### 8.3 Informational Fields

Informational fields provide data that agents SHOULD present to users before completing the associated booking or modification action. Agents MUST NOT use informational fields to block or deny agent actions. Informational fields are not subject to `default_policy` when absent — their absence simply means the information is not available.

#### `complaint_endpoint`

**Type:** String (URL)
**Required:** No
**Classification:** Informational

**Meaning:** A URL where agents or users can report agent misbehavior to the venue.

**Agent behavior:** Agents SHOULD make this URL available to users if an interaction results in a dispute or complaint. Agents MUST NOT use the absence of this field to deny any action. Agents that make HTTP requests to this URL MUST follow the SSRF guidance in Section 6 (Security and Privacy Considerations).

**Absence behavior:** If absent, no complaint endpoint is available. This MUST NOT affect compliance decisions.

#### `cancellation_policy`

**Type:** Object containing `penalty_applies` (boolean, required), `window_minutes` (integer, optional), `penalty_amount` (number, optional), and `currency` (string, optional)
**Required:** No
**Classification:** Informational

**Meaning:** Describes the venue's cancellation policy so the agent can inform the user.

- `penalty_applies`: Whether a penalty is charged for cancellations.
- `window_minutes`: The cancellation window in minutes before the reservation time. Cancellations within this window may incur a penalty.
- `penalty_amount`: The penalty amount.
- `currency`: The currency of the penalty (ISO 4217). If absent, agents SHOULD refer to `venue_currency`.

**Agent behavior:** Agents SHOULD present this information to the user before completing a booking or when processing a cancellation request. Agents MUST NOT use this field to block any action.

**Absence behavior:** If absent, no cancellation policy information is available. This MUST NOT affect compliance decisions.

#### `no_show_policy`

**Type:** Object containing `fee` (number, required), `currency` (string, optional), and `grace_period_minutes` (integer, optional)
**Required:** No
**Classification:** Informational

**Meaning:** Describes the venue's no-show fee policy so the agent can inform the user.

- `fee`: The fee charged for no-shows.
- `currency`: The currency of the fee (ISO 4217). If absent, agents SHOULD refer to `venue_currency`.
- `grace_period_minutes`: The number of minutes after the reservation time before the booking is considered a no-show.

**Agent behavior:** Agents SHOULD present this information to the user when completing a booking. Agents MUST NOT use this field to block any action.

**Absence behavior:** If absent, no no-show policy information is available. This MUST NOT affect compliance decisions.

## 9. Decision Procedure

This section defines the algorithm an agent MUST follow when processing a RestaRules file. The steps are evaluated in order. If any step results in a denial, the agent MUST stop immediately and MUST NOT proceed to subsequent steps.

**Step 1: Validate the rules file.** The agent MUST validate the fetched document against the RestaRules JSON Schema. If validation fails, the agent MUST treat the file as invalid and follow the error handling procedure in Section 10.

**Step 2: Check `disclosure_required`.** If `disclosure_required.enabled` is `true`, the agent MUST disclose its automated nature using the venue's preferred phrasing or equivalent language.

**Step 3: Check channel permissions.** The agent MUST determine the effective channel list for the current action. If `allowed_channels_by_action` is present and contains a key matching the current action, the agent MUST use that action's channel list (full override — see Section 8.2). Otherwise, the agent MUST use base `allowed_channels`. If the agent's intended channel is not in the effective channel list, the agent MUST deny the action.

**Step 4: Check `rate_limits`.** If `rate_limits` is present, the agent MUST verify that the intended action does not exceed any applicable rate limit. The counting scope for each rule is declared by the `counting_scope` field; if absent, the agent MUST count attempts as `"per_agent"` (see Section 8.2). If a limit would be exceeded, the agent MUST deny the action. If `rate_limits` is absent, apply `default_policy`.

**Step 5: Check `human_escalation_required`.** If `human_escalation_required` is present and the current interaction matches any listed condition, the agent MUST escalate to a human and deny the automated action. If absent, apply `default_policy`.

**Step 6: Check `party_size_policy`.** If `party_size_policy` is present and the requested party size exceeds `auto_book_max`, the agent MUST escalate to a human and deny the automated booking. If `large_party_channels` is provided, the agent SHOULD direct the inquiry through one of the listed channels. If absent, apply `default_policy`.

Note: If `large_party_channels` specifies channels that differ from `allowed_channels`, the `allowed_channels` check in Step 3 takes precedence. An agent MUST NOT use a channel that is not listed in `allowed_channels`, even if `large_party_channels` suggests it.

**Step 7: Check `deposit_policy`.** If `deposit_policy` is present and `required` is `true`, the agent MUST inform the user of the deposit requirement and obtain acknowledgment before proceeding. If absent, apply `default_policy`.

**Step 8: Check `user_acknowledgment_requirements`.** If `user_acknowledgment_requirements` is present, the agent MUST present each listed policy to the user and obtain acknowledgment before proceeding. The agent MUST NOT proceed until all listed policies have been acknowledged. If absent, apply `default_policy`.

**Step 9: Check `third_party_restrictions`.** If `third_party_restrictions` is present and any applicable restriction is `true`, the agent MUST deny the restricted action. If absent, apply `default_policy`.

**Step 10: Surface informational fields.** The agent SHOULD present any available informational fields (`complaint_endpoint`, `cancellation_policy`, `no_show_policy`) to the user before completing the associated booking or modification action, or during cancellation handling where applicable. These fields MUST NOT block or deny any action.

## 10. Error Handling

This section defines how agents MUST behave when they encounter errors fetching or processing a rules file. With the exception of HTTP 404 (which indicates the venue has not published a rules file — see below), the default posture is fail-closed: if a rules file appears to exist but the agent cannot successfully retrieve, parse, or validate it, the agent MUST NOT proceed with automated interaction as if no rules exist.

### Rules file not found (HTTP 404)

If the venue's server returns a 404 response for the well-known path, the agent SHOULD interpret this as the venue not having published a RestaRules file. The agent MAY proceed with standard automated interaction, as no RestaRules constraints apply. An absent rules file does not imply any specific venue policy — it simply means the venue has not opted into the RestaRules protocol.

### Invalid JSON

If the response body is not valid JSON, the agent MUST ignore the file and MUST NOT proceed with automated interaction based on its contents.

### Invalid content type

If the response `Content-Type` is not `application/json`, the agent SHOULD ignore the file. The agent MAY attempt to parse the body as JSON regardless, but SHOULD treat a non-JSON content type as a warning that the file may not be a valid rules document.

### Schema validation failure

If the JSON document fails validation against the RestaRules schema (e.g., missing required fields, invalid field types), the agent MUST treat the file as invalid. The agent MUST NOT selectively process fields from an invalid file. The agent SHOULD abort the automated interaction.

### Unsupported `schema_version`

If the `schema_version` field contains a value the agent does not recognize, the agent MUST NOT process the file. An unrecognized version means the document structure may have changed in ways the agent cannot safely interpret. See Section 7 (Versioning).

### Network timeout

If the agent cannot reach the venue's server within a reasonable timeout period, the agent MUST NOT proceed as if no rules exist. The agent SHOULD retry once. If the retry also fails, the agent SHOULD abort the automated interaction or fall back to the most recently cached version of the rules file if one is available and has not expired.

### Truncated response

If the response body appears truncated (e.g., incomplete JSON), the agent MUST treat the response as invalid and MUST NOT attempt to process partial data.

### Expired or invalid TLS certificate

If the venue's server presents an expired, self-signed, or otherwise invalid TLS certificate, the agent MUST NOT proceed with the request. The agent MUST NOT bypass certificate validation to retrieve a rules file.

### Server errors (HTTP 5xx)

If the venue's server returns a 5xx error (such as 500 or 503), the agent SHOULD retry once after a reasonable delay. If the server provides a `Retry-After` header, the agent SHOULD respect it. If the retry also fails, the agent SHOULD abort the automated interaction or fall back to the most recently cached version of the rules file if one is available and has not expired.

### Other client errors (HTTP 4xx)

If the venue's server returns a 4xx error other than 404 (such as 403 Forbidden), the agent MUST treat the rules file as unavailable. The agent SHOULD abort the automated interaction, as the venue's server has actively refused the request.

## 11. Caching Considerations

Agents SHOULD respect HTTP cache headers (`Cache-Control`, `ETag`, `Last-Modified`) when fetching rules files. Proper caching reduces load on venue servers and improves agent performance.

If the venue's server provides no cache headers, agents SHOULD refresh the rules file no more frequently than once every 24 hours.

Venues SHOULD set appropriate `Cache-Control` headers based on how frequently their rules change:

- Venues that rarely change rules: `Cache-Control: public, max-age=86400` (24 hours)
- Venues that change rules occasionally: `Cache-Control: public, max-age=3600` (1 hour)
- Venues that need rapid rule updates: `Cache-Control: public, max-age=900` (15 minutes)

Agents MUST NOT cache a rules file indefinitely. Even if cache headers permit long-lived caching, agents SHOULD re-fetch the rules file at least once every 7 days to ensure they are operating on reasonably current information.

## 12. Conformance

### 12.1 Agent Conformance

An agent implementation conforms to this specification if it meets all of the following requirements:

1. The agent fetches the rules file from the well-known URI path before initiating any interaction with a venue.
2. The agent validates the fetched document against the RestaRules JSON Schema.
3. The agent processes all fields according to the semantics defined in Section 8.
4. The agent follows the 10-step Decision Procedure defined in Section 9 in the specified order, including short-circuit evaluation on denial.
5. The agent handles errors according to Section 10.
6. The agent respects caching guidance as described in Section 11.
7. The agent ignores fields it does not recognize, per the extensibility rule in Section 7.

An agent that does not fetch and process the rules file before interacting with a venue MUST NOT claim RestaRules compliance.

### 12.2 Venue Conformance

A venue conforms to this specification if it meets all of the following requirements:

1. The venue publishes a rules file at the well-known URI path `/.well-known/agent-venue-rules.json`.
2. The rules file is valid JSON and passes validation against the RestaRules JSON Schema.
3. The rules file is served over HTTPS with a `Content-Type` of `application/json`.
4. All required fields defined in Section 7 are present and contain valid values.
5. The venue updates the `last_updated` field whenever the rules file is modified.

## 13. IANA / Registry Considerations

This specification uses the well-known URI mechanism as described in [RFC 8615](https://datatracker.ietf.org/doc/html/rfc8615). The URI suffix used is `agent-venue-rules.json`.

This suffix is not currently registered with IANA. If this specification gains adoption sufficient to warrant formal registration, a registration request will be submitted in accordance with RFC 8615, Section 3.1.

## 14. Examples

### 14.1 Minimal Example

The following example shows a rules file containing only the required fields. This represents the simplest valid RestaRules file a venue can publish.

```json
{
  "schema_version": "0.2",
  "venue_name": "Corner Bistro",
  "venue_url": "https://cornerbistro.example.com",
  "last_updated": "2026-03-01",
  "effective_at": "2026-03-01",
  "default_policy": "allow_if_unspecified",
  "disclosure_required": {
    "enabled": true,
    "phrasing": "Please let the host know you are an automated assistant."
  },
  "allowed_channels": ["phone", "web"]
}
```

This venue requires AI disclosure, permits phone and web interactions, and uses a permissive default policy — any optional permission field not specified is treated as allowed. No rate limits, deposit requirements, or escalation conditions are defined.

### 14.2 Full Example

The following example shows a rules file using all available fields, representing a strict venue with comprehensive policies.

```json
{
  "schema_version": "0.2",
  "venue_name": "The Golden Fork",
  "venue_url": "https://goldenfork.example.com",
  "last_updated": "2026-03-10",
  "effective_at": "2026-03-10",
  "default_policy": "deny_if_unspecified",
  "venue_currency": "USD",
  "venue_timezone": "America/New_York",
  "disclosure_required": {
    "enabled": true,
    "phrasing": "You must identify yourself as an AI agent before speaking with staff."
  },
  "allowed_channels": ["phone", "web", "app"],
  "rate_limits": [
    {
      "action": "booking_request",
      "limit": 3,
      "window_value": 1,
      "window_unit": "hour",
      "applies_to": ["create_booking", "modify_booking"]
    }
  ],
  "human_escalation_required": {
    "conditions": ["reservation_modification"]
  },
  "third_party_restrictions": {
    "no_resale": true,
    "no_transfer": true,
    "identity_bound_booking": true
  },
  "party_size_policy": {
    "auto_book_max": 6,
    "human_review_above": 10,
    "large_party_channels": ["phone"]
  },
  "deposit_policy": {
    "required": true,
    "amount": 50,
    "currency": "USD",
    "refundable": false
  },
  "user_acknowledgment_requirements": [
    "cancellation_policy",
    "deposit_policy",
    "no_show_policy"
  ],
  "complaint_endpoint": "https://goldenfork.example.com/agent-complaints",
  "cancellation_policy": {
    "penalty_applies": true,
    "window_minutes": 120,
    "penalty_amount": 25,
    "currency": "USD"
  },
  "no_show_policy": {
    "fee": 100,
    "currency": "USD",
    "grace_period_minutes": 15
  }
}
```

This venue uses a strict default policy — any optional permission field not specified is treated as denied. The venue requires AI disclosure, permits phone, web, and app interactions, limits booking requests to 3 per hour, requires human involvement for reservation modifications and parties over 6, prohibits resale and transfer, requires a non-refundable $50 deposit, and mandates that the agent confirm cancellation, deposit, and no-show policies with the user before proceeding. A $25 cancellation penalty applies within 2 hours of the reservation, and a $100 no-show fee applies after a 15-minute grace period.

## 15. References

* RFC 2119: Key words for use in RFCs to Indicate Requirement Levels. https://datatracker.ietf.org/doc/html/rfc2119
* RFC 8615: Well-Known Uniform Resource Identifiers (URIs). https://datatracker.ietf.org/doc/html/rfc8615
* ISO 8601: Date and time format. Calendar dates are formatted as YYYY-MM-DD.
* ISO 4217: Currency codes. Three-letter alphabetic codes (e.g., USD, EUR, GBP).
* JSON: The JavaScript Object Notation data interchange format. https://www.json.org
