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

## 6. Security and Privacy Considerations

## 7. Document Format

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
