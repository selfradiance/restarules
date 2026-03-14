# Changelog

All notable changes to the RestaRules project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3] - 2026-03-14

### Added
- `counting_scope` enum on rate limit rules (`per_agent`, `per_user`, `per_session`)
- `allowed_channels_by_action` for per-action channel overrides (full override, not intersection)
- `booking_window` with `min_hours_ahead` and `max_days_ahead` constraints
- Contradictory booking window detection (returns `NOT_EVALUATED` with warning)
- Formal specification document (`spec/restarules-spec.md`) with 11-step decision procedure
- Example ecosystem: 4 fictional venues demonstrating different policy postures
- Portable compliance test vectors (`test/compliance/`) — 15 language-agnostic input/output pairs
- Dual action vocabulary clarifying note in spec (Section 4)
- `effective_at` first-fetch behavior documented in spec
- `venue_timezone` IANA requirement documented in spec

### Changed
- Removed `additionalProperties: false` from top-level schema for forward compatibility
- Fixed `$id` to resolve to GitHub Pages URL (`selfradiance.github.io`)
- Clarified `deposit_policy.amount` as per-booking (was ambiguous "per person or per booking")
- Updated `large_party_channels` spec note to reference effective channel list (including per-action overrides)
- Tightened acknowledgment semantics: agents silently skip absent policy references
- Renamed demo from "Voice Demo" to "Agent Compliance Demo"

## [0.2] - 2026-03-09

### Added
- `party_size_policy` with `auto_book_max`, `human_review_above`, and `large_party_channels`
- `deposit_policy` with `required`, `amount`, `currency`, and `refundable`
- `cancellation_policy` with `penalty_applies`, `window_minutes`, `penalty_amount`, and `currency`
- `no_show_policy` with `fee`, `currency`, and `grace_period_minutes`
- `user_acknowledgment_requirements` array for pre-action policy confirmation
- `venue_currency` and `venue_timezone` metadata fields
- `applies_to` action scoping on rate limit rules (references `$defs.action_type`)
- Agent SDK (`sdk/`) with `validateRules` and `evaluateCompliance` exports
- Agent Compliance Demo (browser-based, Web Speech API)

### Changed
- Migrated party-size escalation logic from `human_escalation_required` to dedicated `party_size_policy`

## [0.1] - 2026-03-05

### Added
- Initial schema with 8 required fields and 4 optional fields
- CLI compliance checker (`cli/check.js`)
- Reference agent demo (`reference-agent/`)
- `.well-known/` publishing on GitHub Pages
- GitHub Actions CI
