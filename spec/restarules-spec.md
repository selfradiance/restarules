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

### 8.2 Permission Fields

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
