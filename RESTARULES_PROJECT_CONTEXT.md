# Project #2 — RestaRules: Machine-Readable Agent Conduct Rules for Restaurants
Last updated: 2026-03-14 (Session 24 — Hardening Pass)
Owner: James Toole
Repo: github.com/selfradiance/restarules (public)
Local folder: ~/Desktop/restarules
Skill level: Beginner — James has no prior coding experience. He directs AI coding agents (Claude Code) to build the project. Explain everything simply. Take baby steps.

## Status: Session 24 — Hardening Pass (Complete)

Session 24 addressed 7 findings from a security/code quality audit. All findings resolved, all 151 tests passing.

### What was fixed

**Finding 1: Input validation fail-open** — NaN and invalid date values silently passed through numeric/date comparisons (JavaScript's `NaN >= limit` evaluates to `false`). Added `Number.isFinite()` guards for party size and attempt count, and `isNaN(new Date(...).getTime())` guards for timestamps in `sdk/evaluator.js`. CLI also validates inputs before processing (exits code 2). Added 5 SDK tests (M1-M5), 4 reference agent tests (30-33), 3 CLI tests (27-29). (Commit `0dd4391`)

**Finding 2: Dependency classification** — Verified ajv/ajv-formats correctly in devDependencies at root (not npm-published), and in dependencies in sdk/package.json (published package). No changes needed.

**Finding 4: Reference agent crash path** — `agent.js` referenced `report.partySize.conditions` (doesn't exist; correct property is `report.escalationConditions`) and crashed when `--party-size` was absent with `party_size_policy` present. Fixed property name and added null-safe guard. Added test 29. (Commit `1d12a68`)

**Finding 5: Deduplicate evaluator/validator/schema** — Three modules had independent Ajv instances and schema copies. Replaced `reference-agent/decisions.js` (264→11 lines) with re-export from `sdk/evaluator.js`. Made `cli/check.js` and `reference-agent/agent.js` import `validateRules` from `sdk/validator.js` instead of maintaining separate Ajv instances. Added `prepublishOnly` script to sync schema before npm publish. Added test N1 verifying schema sync. (Commit `eb23755`)

**Finding 6: Harden remote fetch** — Reference agent now enforces HTTPS-only URLs, validates URL format, sets 10-second fetch timeout via `AbortSignal.timeout`, validates content-type header, and enforces 1MB response size limit. Added 3 tests (O1-O3). (Commit `7ee3001`)

**Finding 7: CLI exit code semantics** — CLI now exits 0 for ALLOW, 1 for DENY, 2 for invalid input or schema failure (previously always exited 0). Updated ~15 existing tests from `execSync` to `spawnSync` pattern and added 6 new exit code tests. (Commit `cffa6e1`)

**Finding 9: CI improvements** — Added Node version matrix (18, 20, 22) and separate `npm audit --omit=dev` job. (Commit `7197e7a`)

### Test counts (151 total)
- Schema validation: 29 tests
- CLI compliance checker: 32 tests
- Reference agent: 37 tests
- SDK exports: 38 tests
- Compliance vectors: 15 tests

---

## Session 23 — Final Audit Documentation Fixes (Complete)

Session 23 executed 3 baby steps fixing findings from the final cold-eyes audit (Claude Opus 4.6, verified against cloned repo with all 131 tests passing). ChatGPT's cold-eyes audit was evaluated but found to be based on stale repo data (GitHub rendered v0.1-era page with 22 commits; actual repo has 124 commits). Most ChatGPT findings were already fixed in Session 22. Three genuine documentation clarifications were identified and fixed.

### What was fixed

**Baby Step 1: README default_policy list** — Added fallback note to `allowed_channels_by_action` in the permission fields list, aligning with spec Section 8.2 which clarifies that base `allowed_channels` governs when per-action overrides are absent. (Commit `055349f`)

**Baby Step 2: Spec escalation conditions** — Updated valid condition values from only `reservation_modification` to all five values in the schema enum: `reservation_modification`, `special_event_booking`, `complaint_or_dispute`, `accessibility_request`, `dietary_emergency`. (Commit `6ff43c2`)

**Baby Step 3: SDK README action parameter** — Clarified that the `action` parameter matches against different vocabularies depending on context: `rate_limits[].action` for rate limit checks, `allowed_channels_by_action` keys for channel checks, and `create_booking` specifically for booking window enforcement. (Commit `8852c6b`)

**Baby Step 4: SDK published to npm** — `restarules-sdk` v0.3.0 published to npm registry. Bumped `sdk/package.json` version, added `files` and `engines` fields. Fresh install verified with `npm install restarules-sdk` in clean directory. SDK README and root README updated with `npm install restarules-sdk` instructions. (Commits `c7678c1`, `b05a714`)

### Test count
131 tests (unchanged).

### Project status
RestaRules is complete as a foundation. Schema v0.3 is fully built, specified, tested, documented, audited, and published. All known issues resolved. No outstanding normative gaps. SDK live on npm.

### Forward items (separate future work)
- JSON generator web tool — separate project, restaurant onboarding ("paste your rules, get your JSON")
- Optional v0.4 schema additions (typed complaint endpoint, per-action scoping on other fields, conditional deposit applicability, supported_languages)

## Status: Session 22 — Cold-Eyes Audit Fix Round (Complete)

Session 22 executed 13 baby steps (Baby Steps 0-9, 11-14; Baby Step 10 dropped) fixing findings from three independent cold-eyes audits (ChatGPT, Gemini, Claude Opus 4.6). No new features — all changes tighten documentation, fix normative gaps, add compliance test vectors, and improve README framing.

### What was fixed

**Baby Step 0: Pre-build verification sweep** — READ-ONLY. Confirmed/rejected 12 audit findings against actual source files. 9 confirmed, 2 rejected (large_party_channels interaction already specified in spec; empty allowed_channels already blocked by minItems:1), 1 partially confirmed (dual vocabulary explanation exists but buried in rate_limits definition).

**Baby Step 1: Extensibility fix** — Removed `additionalProperties: false` from top-level schema for forward compatibility. Sub-objects remain strict. Updated spec and README extensibility language. (Commit `bad0a70`)

**Baby Step 2: $id fix** — Changed `$id` from unowned `restarules.org` domain to GitHub Pages URL (`selfradiance.github.io/restarules/schema/agent-venue-rules.schema.json`). (Commit `1504ac1`)

**Baby Step 3: deposit_policy.amount clarification** — Changed description from "per person or per booking (context-dependent)" to "per booking" across schema, SDK schema, spec, and README. Added forward-compatibility note about future `amount_basis` field. (Commit `a12d64b`)

**Baby Step 4: large_party_channels spec fix + pinning test** — Updated spec Step 6 note to reference effective channel list (Steps 3-4) instead of just base `allowed_channels`. Added pinning test verifying per-action override takes precedence over `large_party_channels`. New fixture: `test-venue-with-large-party-channel-conflict.json`. (Commit `d6b968e`)

**Baby Step 5: effective_at + venue_timezone spec notes** — Added first-fetch guidance for `effective_at` (treat future-dated rules as not yet in effect when no cache exists). Added `venue_timezone` IANA requirement to spec and schema README. (Commit `902a4cb`)

**Baby Step 6: Dual action vocabulary note** — Added dedicated "Action Vocabularies" subsection to spec Section 4 (Terminology) explaining rate limit action labels vs shared action types. Added cross-reference from rate_limits field definition. (Commit `6caa000`)

**Baby Step 7: Portable compliance test vectors** — Created `test/compliance/` with 15 language-agnostic JSON test vectors covering schema validation, channel checks (base + per-action), party size, booking window, deposit policy, default policy, and cross-cutting edge cases. JavaScript validator wired into `npm test`. (Commit `f1f87ee`)

**Baby Step 8: Link compliance suite** — Added Section 12.3 to spec and "Compliance Test Vectors" subsection to README, both pointing to `test/compliance/`. (Commit `7bd925e`)

**Baby Step 9: "Why voluntary compliance works"** — Added README section explaining the robots.txt enforcement model, agentic commerce parallel, asymmetric incentives, and partial adoption value. (Commit `337a9c7`)

**Baby Step 10: Dropped** — `allowed_channels` requires `minItems: 1`, so a "deny all agents" example doesn't fit the schema. A venue that wants to deny all agents simply doesn't publish a rules file.

**Baby Step 11: Demo rename** — Renamed from "Voice Demo" to "Agent Compliance Demo" across README, demo HTML title/heading/subtitle, and app.js comment. URL unchanged (`/demo/voice/`). (Commit `8623779`)

**Baby Step 12: README opening + CHANGELOG + test count** — Added pain-point opening (agents calling restaurants, scalping, anti-bot laws, EU AI Act). Created `CHANGELOG.md` covering v0.1-v0.3. Fixed stale test count (107 → 131). (Commit `e901010`)

**Baby Step 13: Demo bundle rebuild** — Rebuilt `demo/voice/bundle.js` (321.4KB) with corrected `$id`, per-booking deposit description, `additionalProperties` removal, and forward compatibility note. (Commit `dd7e233`)

### Commits
- `bad0a70` — Remove additionalProperties: false from top-level schema for forward compatibility
- `1504ac1` — Fix schema $id to resolve to GitHub Pages URL
- `a12d64b` — Clarify deposit_policy.amount as per-booking in schema, spec, and docs
- `d6b968e` — Clarify large_party_channels respects per-action channel overrides in spec; add pinning test
- `902a4cb` — Specify effective_at first-fetch behavior and venue_timezone IANA requirement in spec
- `6caa000` — Add dedicated clarifying note on dual action vocabularies to spec
- `f1f87ee` — Add portable compliance test vectors with language-agnostic input/output pairs
- `7bd925e` — Link compliance test vectors from spec and README
- `337a9c7` — Add "Why voluntary compliance works" section to README
- `8623779` — Rename demo from "Voice Demo" to "Agent Compliance Demo" in docs and UI
- `e901010` — Add pain-point opening to README, create CHANGELOG.md, fix stale test count
- `dd7e233` — Rebuild demo bundle with Session 22 schema and SDK changes

### Test count
131 tests (29 schema + 26 CLI + 29 reference agent + 32 SDK + 15 compliance vectors) — up from 115 at end of Session 21.

## Status: Session 21 — Post-v0.3 Audit Fix Round (Complete)

Session 21 executed 6 baby steps fixing findings from ChatGPT and Gemini in-project audits of the v0.3 build. No new features — all changes tighten documentation, add edge-case tests, and fix one behavioral gap (contradictory booking window detection).

### What was fixed

**Baby Step 1: Spec examples to v0.3** — Updated Corner Bistro minimal example to `schema_version: "0.3"` and added all v0.3 fields (`allowed_channels_by_action`, `counting_scope`, `booking_window`) to Golden Fork full example in spec.

**Baby Step 2: Step count scrub** — Verified all live documents already consistent at 11 steps. Historical context entries describing earlier step counts (7→10→11) are accurate for their respective sessions. No changes needed.

**Baby Step 3: Timezone-qualified ISO 8601 docs** — Added normative paragraph to spec requiring timezone-qualified ISO 8601 timestamps for `targetTime`/`currentTime`. Updated SDK README parameter docs and main README booking window section with format examples. Added `--target-time` timezone note to CLI usage.

**Baby Step 4: Edge-case tests** — Added 3 tests: timezone absent + booking window → NOT_EVALUATED (CLI + reference agent), absent booking window + deny_if_unspecified → no denial carve-out (reference agent). New fixture: `test-venue-with-booking-window-no-tz.json`.

**Baby Step 5: Spec and schema README polish** — Added rationale paragraph after acknowledgment silent-skip rule in spec. Added URL Validation section to schema README with SSRF prevention guidance link.

**Baby Step 6: Contradictory booking window** — SDK evaluator now detects contradictory windows (`min_hours_ahead >= max_days_ahead * 24`) before evaluation. Returns `NOT_EVALUATED` with warning reason. CLI outputs warning instead of denial. New fixture: `test-venue-with-contradictory-window.json`. Demo bundle rebuilt. Added 5 tests (2 CLI + 2 reference agent + 1 SDK).

### Commits
- `17c66fc` — Update spec examples to v0.3 (Corner Bistro + Golden Fork)
- `d9b0eb4` — Document timezone-qualified ISO 8601 requirement for booking window timestamps
- `89972e3` — Add edge-case tests for booking window (no timezone, absent window carve-out)
- `3249d25` — Polish spec acknowledgment rationale and schema README URL validation section
- `5401c21` — Detect contradictory booking windows and treat as non-actionable with warning

### Test count
115 tests (29 schema + 26 CLI + 28 reference agent + 32 SDK) — up from 107 at end of v0.3 build.

## Status: Session 20 — v0.3 Schema Build (Complete)

Session 20 completed the v0.3 schema build in 15 baby steps across 4 phases. Triple-audited build plan (ChatGPT and Gemini) executed without deviation. All features, cleanup items, documentation, and demo bundle updated in a single session.

### What was built

**Phase 1: Rate Limit Identity (Baby Steps 1-3)**
- Added optional `counting_scope` enum (`per_agent`, `per_user`, `per_session`) to each rate limit rule
- Default when absent: `per_agent`. `per_ip` explicitly excluded (transport-layer, not conduct-layer)
- SDK/CLI/reference agent surface counting scope in output (report-only — no pass/fail change)
- Spec updated with field definition, normative default text, and decision procedure clarification

**Phase 2: Per-Action Channels (Baby Steps 4-6)**
- Added optional `allowed_channels_by_action` top-level object field
- Keys: action types from `$defs.action_type`; values: arrays of channel enums
- Full override semantics: per-action list completely replaces base `allowed_channels` (not intersection, not merge)
- Empty array is valid — means "no channel permitted for this action"
- Classification: permission field
- SDK/CLI/reference agent implement override lookup with `source` field in output
- Spec updated with field definition, override semantics, and decision procedure step update

**Phase 3: Booking Window (Baby Steps 7-9)**
- Added optional `booking_window` top-level object with `min_hours_ahead` and `max_days_ahead`
- Three locked design rules:
  1. Applies to `create_booking` only
  2. Requires `venue_timezone` for enforcement; informational only without it
  3. `default_policy` carve-out: absent booking window NEVER blocks (overrides `deny_if_unspecified`)
- SDK evaluator accepts `currentTime` and `targetTime` parameters for booking window math
- CLI accepts `--target-time` argument
- Coherence rule in spec: contradictory sub-fields → treat as non-actionable, log warning
- Decision procedure now 11 steps (was 10), with booking window as Step 7

**Phase 4: Cleanup & Closeout (Baby Steps 10-15)**
- Acknowledgment semantics (Step 10): agents MUST silently ignore `user_acknowledgment_requirements` entries referencing absent policy fields. Skip MUST NOT cascade into `default_policy` denial.
- Version bump and drift fixes (Step 11): `schema_version` enum accepts `"0.1"`, `"0.2"`, `"0.3"`. Schema description, spec front matter, schema/README, and main README all updated to v0.3. Decision procedure step count verified consistent across spec, README, and schema README.
- Example files updated (Step 12): Golden Fork (all v0.3 features), Bella Notte (`counting_scope` + `booking_window`), Omakase Sato (per-action channels + `per_user` counting + strict booking window), Magnolia Garden (`per_session` counting + event booking window), Corner Slice (version bump only — intentionally minimal).
- README and SDK README (Step 13): Full v0.3 field documentation, example ecosystem table updated with v0.3 features column, SDK API reference updated with new parameters and output fields.
- Demo bundle rebuilt (Step 14): `demo/voice/bundle.js` rebuilt with v0.3 SDK (322KB → 328KB). Live demo at GitHub Pages picks up v0.3 bundle and v0.3 Bella Notte rules.
- Final fixture sweep (Step 15): All 14 test fixtures bumped to `schema_version: "0.3"`. No stale version strings remain.

### Commits (Baby Steps 1-15)
- `6229b53` — Add counting_scope enum to rate limit rules in schema
- `66e039b` — Surface counting_scope in SDK evaluator, CLI checker, and reference agent
- `50ce925` — Add counting_scope field definition and normative text to spec
- `e175836` — Add allowed_channels_by_action to schema for per-action channel overrides
- `7b48640` — Wire per-action channel overrides into SDK evaluator, CLI, and reference agent
- `277ee70` — Add allowed_channels_by_action field definition and override semantics to spec
- `72b3e48` — Add booking_window to schema with min_hours_ahead and max_days_ahead
- `559340e` — Wire booking_window into SDK evaluator, CLI, and reference agent
- `e6e61b4` — Add booking_window field definition, decision procedure step, and normative rules to spec
- `24588a3` — Tighten acknowledgment semantics: silently skip absent policy references
- `7e8f4a5` — Version bump to 0.3: update schema_version enum, description, field classifications, and terminology pass
- `d974802` — Update example files with v0.3 fields
- `6d1b3c8` — Update README and SDK README with v0.3 schema documentation and API changes
- `eaf963f` — Rebuild browser demo bundle with v0.3 SDK changes
- `18ef11b` — Bump all test fixtures to schema_version 0.3 — v0.3 build complete

### Test count
107 tests (29 schema + 23 CLI + 24 reference agent + 31 SDK) — up from 69 at end of v0.2. (Now 115 after Session 21 audit fixes.)

## Status: Session 19 — Example Ecosystem (Complete)

Session 19 added three fictional venue example files to create an "Example Ecosystem" — multiple restaurants each illustrating a different RestaRules policy posture. Together with the existing Bella Notte file, the repo now demonstrates four distinct approaches to venue-authored agent conduct rules.

### What was built
- **`examples/the-corner-slice.json`** — Permissive casual pizza joint. `allow_if_unspecified`, 4 channels (phone/web/app/sms), auto-book up to 10, no deposit, no third-party restrictions. Shows that even a laid-back venue benefits from publishing basic rules.
- **`examples/omakase-sato.json`** — Strict high-end 12-seat omakase counter. `deny_if_unspecified`, web-only, auto-book max 2, $200 non-refundable deposit, identity-bound/no-resale/no-transfer, agent must confirm all three financial policies with user. Maximum lockdown scenario.
- **`examples/magnolia-garden.json`** — Large-party/event-focused Southern restaurant. `deny_if_unspecified`, phone/web/email, auto-book up to 6 with human review above 8, $50 refundable deposit, scoped rate limits using `applies_to`. Shows how event-style venues use different levers.
- **README updated** with "Example Ecosystem" section containing a comparison table of all four venues and file location links.

### Fixes applied during build
- `rate_limits[].action` values corrected from `$defs.action_type` vocabulary (`create_booking`, `check_availability`, `modify_booking`) to schema-valid `rate_limits` action enum (`booking_request`, `inquiry`). The two enums serve different purposes: `action` identifies the rate limit rule type; `applies_to` scopes to specific `$defs.action_type` actions.
- `identity_bound` corrected to `identity_bound_booking` in both Omakase Sato and Magnolia Garden (schema field name includes `_booking`).
- Bella Notte row in README comparison table corrected to match actual file values: `phone, web` channels (not `phone, web, app`), auto-book up to 4 (not 8), $25 refundable deposit (not "None").

### Commits
- `45b81d4` — Add The Corner Slice example
- `2a74fba` — Add Omakase Sato example
- `a508bb0` — Add Magnolia Garden example
- `d720806` — Add Example Ecosystem section to README

## Status: Session 18 — Formal Specification Document (Complete)

Session 18 completed the formal RestaRules specification document (`spec/restarules-spec.md`) — a proper RFC/W3C-style spec describing the document format, field semantics, discovery mechanism, decision procedure, error handling, and conformance requirements.

### What was built
- **`spec/restarules-spec.md`** — 15-section specification document (~665 lines) covering:
  - Scope, terminology, and conformance language (RFC 2119)
  - Discovery and transport (`.well-known/` URI, HTTPS-only, RFC 8615)
  - Security and privacy considerations (SSRF prevention, TLS validation, rate limit identity)
  - Document format (required/optional field tables, versioning, extensibility)
  - Field definitions — 7 metadata fields, 10 permission fields, 3 informational fields
  - 10-step short-circuiting decision procedure
  - Error handling (8 scenarios, fail-closed with 404 carve-out)
  - Caching considerations (Cache-Control, ETag, Last-Modified)
  - Agent and venue conformance requirements
  - Two complete JSON examples (minimal Corner Bistro + full Golden Fork)
  - Normative references section

### Key design decisions
- **Fail-closed error handling** with explicit 404 exception (venue has no rules file → fail-open, agent may proceed)
- **10-step decision procedure** — short-circuits on first denial, Steps 1-9 are blocking, Step 10 applies `default_policy` to absent permission fields
- **Three field taxonomies**: metadata (context), permission (governed by `default_policy`), informational (never block actions)
- **MUST NOT proceed** for unrecognized `schema_version` (hardened from SHOULD during audit)

### Audit results
- 22 first-round fixes applied (triple-audit by ChatGPT and Gemini)
- 9 second-round fixes applied (follow-up audit)
- All fixes were tightening language, closing normative gaps, or adding precision — no structural changes

### Source alignment check
- Spec aligns with README decision procedure, schema fields, and SDK behavior
- `schema_version` handling consistently says MUST NOT across all three references in the spec
- Conformance section references correct 10-step count

## Status: Session 17 — Post-Publication Community Feedback & Standard-Solidifying Ideas

Session 17 was a thinking/planning session (no code changes). RestaRules articles are now published. Received substantive Twitter engagement from a technically sophisticated reader who independently connected RestaRules to EU AI Act Article 50(1) transparency obligations and described it as potentially becoming an "implementation standard."

### Key Insight from Community Feedback
The robots.txt parallel was validated and sharpened by a reader: crawlers built the norm voluntarily because blocking them was technically trivial. With agentic commerce the stakes are higher — a rogue booking agent costs a restaurant real money, not just bandwidth. This asymmetry is why a voluntary norm alone is unlikely to be sufficient long-term, and why a machine-readable protocol becomes increasingly important.

The EU AI Act Article 50 connection: Art. 50(1) requires AI systems interacting with natural persons to disclose they are AI. RestaRules `disclosure_required` field covers exactly this scenario (an AI agent calling a human host stand). The August 2026 enforcement date creates real urgency. Current regulatory energy is focused on content labeling and deepfakes — agentic commerce interactions have not yet been explicitly addressed — but the direction of travel is clearly toward folding them in. The AI Office guidelines are due by August 2026.

### Two Standard-Solidifying Ideas (Decided This Session)
These are not urgent — James is finishing another project — but both are captured here to action in a future session. Neither requires significant code. Both are writing and presentation work.

**1. Formal Specification Document**
Publish a proper spec document — something that reads like an RFC or a W3C note — describing the RestaRules format, required fields, optional fields, semantics, and implementation requirements. The *form* signals seriousness. The difference between "a guy built a JSON schema" and "there's a published spec for this" is significant for first-mover positioning. This would live in the repo (e.g., `spec/restarules-spec.md`) and potentially as a GitHub Pages page.

**2. Example Ecosystem (Small Registry of Fictional Venues)**
Currently the repo has one demo venue (Bella Notte). Adding 2-3 more named fictional restaurants, each illustrating different policy choices (strict vs. permissive, deposit-required, large-party-focused, etc.), would make RestaRules feel like a living ecosystem rather than a single demo. These would be real `/.well-known/agent-venue-rules.json` files hosted on GitHub Pages subpaths or documented as examples in the repo.

Both ideas emerged from a jamble about what makes a standard feel like *a standard* vs. just open source code. The answer: a spec document gives it authority; an example ecosystem gives it credibility.

## Status: Session 16 — Pre-Writing Audit & Cleanup

Session 16 performed live verification and documentation cleanup in preparation for the writing phase. Triple-audited by Claude, Gemini, and ChatGPT.

### Live Demo Verification
- Browser voice demo verified working in Chrome — all 5 scenarios tested, rule traces displayed correctly, speech output confirmed. Demo URL: `https://selfradiance.github.io/restarules/demo/voice/`
- Live rules file at `/.well-known/agent-venue-rules.json` confirmed serving valid JSON with all v0.2 fields
- Private files (project context, operating contract, process template) confirmed gitignored and not present on GitHub

### README Fixes (7 commits)
1. Updated Status section — replaced stale v0.1 description with full current state (v0.2 schema, CLI, reference agent, SDK, voice demo, 69 tests, CI) (commit 4d11aa0)
2. Expanded Decision Procedure for Agents from 7 steps to 11 steps — added party_size_policy, deposit_policy, user_acknowledgment_requirements, cancellation/no_show informational fields, and applies_to scoping on rate limits (commit 4d11aa0)
3. Fixed SDK README install instructions — replaced `npm install restarules-sdk` with local clone/install instructions since package is not published to npm (commit ed3045a)
4. Added Golden Fork vs Bella Notte clarification to Schema section (commit da966b8)
5. Updated live demo description to match actual deployed Bella Notte file — now lists all 10 optional fields present (commit bc2739d)
6. Updated Bella Notte description from "realistic minimal file" to "near-complete v0.2 file" (commit bc2739d)

### Repo Hygiene
7. Fixed `.gitignore` — replaced `process-template-v2.md` with `process-template*.md` wildcard to cover all versions (commit 322d248)
8. Polished root `package.json` — added description, changed `main` from nonexistent `index.js` to `cli/check.js` (commit 322d248)

### Audit Findings Parked for Writing Phase
- Proactively address "why not JSON-LD?" in articles (Gemini)
- Frame rate limit identity as v0.3 roadmap feature, not a gap (Gemini)
- Use "I could not find an existing open standard" rather than "no competitors" in public writing (ChatGPT)
- Consider adding a "why now" paragraph with EU AI Act / anti-bot law hooks to README (ChatGPT)
- Consider adding a flow diagram: venue → .well-known JSON → agent fetch → validate → decide → act (ChatGPT)

## Status: Session 15 — Milestone 8: Browser Voice Demo (Complete)

Session 15 completed Milestone 8 (Browser Voice Demo) in 10 baby steps plus a pre-build fix (Baby Step 0). Quadruple-audited build plan (ChatGPT x2, Gemini x1, Claude x1) executed without deviation. The demo is live at `https://selfradiance.github.io/restarules/demo/voice/`.

### Pre-Build Verification & Baby Step 0
- Ran 8 pre-build checks: confirmed CommonJS format needs bundler, identified 4 missing v0.2 fields in Bella Notte rules file
- Baby Step 0: Added `rate_limits`, `cancellation_policy`, `no_show_policy`, and `user_acknowledgment_requirements` to `.well-known/agent-venue-rules.json` (commit 5f62fa5)

### Baby Steps 1-2: SDK Browser Bundle
1. Investigated SDK browser compatibility — `evaluator.js` is pure (no dependencies), `validator.js` needs Ajv bundling, CommonJS needs bundler (no commit — investigation only)
2. Installed esbuild, created `demo/voice/sdk-entry.js` entry point, added `build:demo` npm script, built 315.2kb IIFE bundle, verified in Node VM (commit 093c4b9)

### Baby Steps 3-5: UI and First Scenario
3. Built full UI scaffold in `index.html` — header, rules source, 5 scenario buttons, rule trace, result panel, speak controls, transcript, disclaimer (commit 914e204)
4. Added live rules fetch from GitHub Pages URL with SDK validation (commit 56f48c5)
5. Wired Scenario 2 (Book for 4 by phone) end-to-end — rule trace, SDK evaluation, result display (commit cb3852c)

### Baby Steps 6-7: Speech and All Scenarios
6. Added Web Speech API integration — `voiceschanged` listener, `speakText` function, button state management, `onend`/`onerror` handlers (commit f568464)
7. Added all remaining scenarios (1: Disclosure, 3: Large party, 4: Deposit, 5: Cancellation/No-show) (commit 4aac3ca)

### Baby Steps 8-10: Polish and Documentation
8. Triggered rules display already implemented within scenario functions (no separate commit)
9. Added graceful speech-unavailable fallback notice (commit 086907c)
10. Added Browser Voice Demo section to root README with live URL (commit d76e7e5)

**Final test count: 69 (19 schema + 17 CLI + 17 reference agent + 16 SDK)**

Milestone 8 is now closed. The thesis is proven end-to-end in the browser: an AI agent fetches live venue rules, evaluates compliance through the real SDK, and speaks results aloud.

## Status: Sessions 14-15 — Milestone 7: Agent SDK Library (Complete)

Sessions 14-15 completed Milestone 7 in 5 steps. The `restarules-sdk` npm package exports `validateRules` (JSON Schema validation via Ajv) and `evaluateCompliance` (full decision procedure). 16 SDK tests across 7 categories.

1. Created SDK package structure with stub exports (commit 4365a0b)
2. Bundled schema and implemented `validateRules` using Ajv Draft 2020-12 (commit 51024d5)
3. Extracted decision engine — copied `decisions.js` to `sdk/evaluator.js`, wired `evaluateCompliance` (commit b743acb)
4. Comprehensive SDK test suite — 2 fixtures, 16 tests across 7 categories (commit c3a3901)
5. SDK README and milestone closeout (commit 5bb6896)

## Status: Session 13 — Milestone 6: v0.2 Schema Design (Complete)

Session 13 completed Milestone 6 in 13 baby steps across three phases. The v0.2 schema is fully designed, implemented, tested, and documented. Triple-audited build plan (ChatGPT x3, Gemini x2) executed without deviation.

### Phase 1: Vocabulary, Primitives & Party-Size Migration (Baby Steps 1-6)
1. Added shared action vocabulary enum (`$defs.action_type`) — four verbs: `check_availability`, `create_booking`, `modify_booking`, `cancel_booking` (commit 85403c3)
2. Added `venue_currency` (ISO 4217) and `venue_timezone` (IANA) as optional top-level fields (commit a5357a7)
3. Added permission vs informational field classifications to `schema/README.md` — committed, versioned reference document (commit 051334f)
4. Documented party-size migration plan in `schema/README.md` (commit 8b619a8)
5. Added `party_size_policy` to schema — `auto_book_max` (required), `human_review_above`, `large_party_channels` — with 3 tests (commit 1e2fa0b)
6. Migrated party-size logic out of `human_escalation_required` — updated schema, all fixtures/examples, reference agent, CLI checker, and tests across 9 files (commit 7b38055)

### Phase 2: Core Business Policies (Baby Steps 7-10)
7. Added `deposit_policy` — permission field — `required` (boolean), `amount`, `currency`, `refundable` — with 3 tests (commit 6dba69d)
8. Added `cancellation_policy` — informational field — `penalty_applies`, `window_minutes`, `penalty_amount`, `currency` — with 3 tests (commit 576b1e3)
9. Added `no_show_policy` — informational field — `fee`, `currency`, `grace_period_minutes` — with 3 tests (commit 6c69eda)
10. Added `user_acknowledgment_requirements` — permission field — array of policy names agents must confirm with user — with 3 tests (commit 91df76d)

### Phase 3: Scoping, Versioning & Integration (Baby Steps 11-13)
11. Added optional `applies_to` action scoping on `rate_limits` rules, referencing `$defs.action_type` via `$ref` — with 3 tests (commit 9944606)
12. Bumped `schema_version` to 0.2 (schema accepts both "0.1" and "0.2"), updated Golden Fork example and Bella Notte demo with all v0.2 fields, added schema version checking guidance to README (commit f3bbae5)
13. Final integration sweep — reference agent and CLI checker now support all v0.2 fields with correct permission/informational semantics; 13 new integration tests (commit 87487eb)

**Final test count: 53 (up from 22 at start of session)**

Milestone 6 is now closed. The v0.2 schema is complete, documented, and enforced end-to-end.

## Status: Session 12 — Pre-Milestone 6 Cleanup: complaint_endpoint Semantics

Session 12 resolved a normative inconsistency identified in triple-audit (Claude, Gemini, ChatGPT):

**Design principle established:** Fields are either **permission fields** (govern whether an agent action is allowed, governed by `default_policy`) or **informational fields** (never block agent actions, not governed by `default_policy`).
- Permission fields: `rate_limits`, `human_escalation_required`, `third_party_restrictions`
- Informational fields: `complaint_endpoint`

Session 12 completed four baby steps:
1. Removed denial logic for missing `complaint_endpoint` from `cli/check.js` — absence now produces an informational note only, not a denial (commit 34e709a)
2. Verified `reference-agent/decisions.js` already treats `complaint_endpoint` as informational — no changes needed (commit 6bdccf1)
3. Updated README `default_policy` section to explicitly distinguish permission fields from informational fields (commit b57cd5f)
4. Added pinning tests in `test/check-compliance.js` (test 12) and `test/reference-agent.js` (test 8) to prevent silent regression — new fixture `test/fixtures/test-venue-no-complaint.json` (commit 20039b4). Total: 22 tests.

## Status: Session 11 — Milestone 5: Reference Agent Demo

Session 11 completed Milestone 5 (Reference Agent Demo) in five baby steps:
1. Created `reference-agent/agent.js` — fetches a rules file from a URL and prints parsed JSON (commit 6cfcf1d)
2. Added schema validation using Ajv — validates fetched rules against the formal schema before processing (commit 79c32ad)
3. Added compliance decision engine — evaluates simulated agent actions (channel, party size, rate limits) against venue rules, respects `default_policy` for undefined fields (commit f1558c8)
4. Extracted decision logic into `reference-agent/decisions.js`, added 8 tests with local fixture, wired into `npm test` — 20 total tests (commit 45eacef)
5. Updated README with Reference Agent Demo section and context file (this entry)

Also note the pre-Milestone 5 cleanup:
- Enforced HTTPS-only URL patterns in schema (`^https?://` → `^https://`) (commit a1254db) — audit catch from Gemini and ChatGPT

Milestone 5 is now closed. The thesis is proven: agents can fetch venue-authored rules, validate them, and change their behavior accordingly.

## Status: Session 10 — Milestone 4: .well-known/ Publishing

Session 10 completed Milestone 4 in four baby steps:
0. Fixed stale "private" repo references in context file — line 4 header changed to `(public)`, Session 4 entry updated to note repo was initially private, later made public (local-only, no commit)
1. Created `.well-known/agent-venue-rules.json` demo file (Bella Notte Trattoria — realistic minimal example with 8 required + 2 optional fields, separate from the full Golden Fork example in `schema/`) and `.nojekyll` file in repo root to ensure GitHub Pages serves dot-directories (commit 87fab85)
2. Enabled GitHub Pages (Deploy from branch: main, root /) — demo file verified live at `https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json`
3. Added "Live Demo" and "Hosting Your Own Rules File" sections to README — includes Cache-Control recommendations (1hr/15min/24hr tiers), CORS guidance (`Access-Control-Allow-Origin: *`), and static hosting notes (commit 57ea623)

Milestone 4 is now closed. The `/.well-known/` publishing pattern is live and documented.

## Status: Session 9 — Triple-Audit Fix Round (ChatGPT catches)

Session 9 completed three baby steps:
1. Added `"app"` to `allowed_channels` schema enum — README examples already used it but schema didn't include it (ChatGPT audit catch)
2. Fixed `schema/README.md` required/optional field counts — was showing 6 required, corrected to 8 required and 4 optional to match actual schema (ChatGPT audit catch)
3. Added MIT LICENSE file to repo root, updated `package.json` from ISC to MIT (ChatGPT audit catch)

Session 8 completed six baby steps (pre-Milestone 4 cleanup driven by triple-audit: Claude, ChatGPT, Gemini):
1. Confirmed no stale `max_attempts_per_agent` references in tracked files (renamed to `rate_limits` in Session 5 — historical references in context file only, intentional)
2. Fixed CI paradox in context file: clarified "CI not yet implemented at that point" vs "CI now active" (local-only change, context file is gitignored)
3. Added Security Considerations section to README — SSRF guidance for `complaint_endpoint` URLs and rate limit identity advisory (Claude triple-audit catch)
4. Added governance boundary sentence to README intro: "RestaRules defines venue-authored conduct constraints for AI agents. It does not define booking lifecycle semantics, availability, or payment processing — those concerns belong to protocols like AgenticBooking and UCP." (ChatGPT audit catch)
5. Added two `default_policy` JSON examples to README — strict venue (deny_if_unspecified) and permissive venue (allow_if_unspecified) (ChatGPT audit catch)
6. Updated context file for Session 8 (this entry)

Session 7 completed multiple baby steps:
1. Reconciled context file: relabeled Milestone 3→3A, clarified CI was not yet implemented at that point, marked stale MVP scope as superseded, removed CI from Tier 2 list (dual audit catches from ChatGPT and Gemini)
2. Closed Milestone 2B: added explicit list of optional fields governed by `default_policy` to README
3. Closed Milestone 2C: added GitHub Actions CI workflow (`.github/workflows/ci.yml`) — runs `npm ci` + `npm test` on push and PR to main. CI is now active.
4. Closed Milestone 3B: expanded CLI compliance checker to cover all Tier 1 optional fields — `rate_limits`, `human_escalation_required`, `third_party_restrictions`, `complaint_endpoint` — with 8 new tests (12 total across both suites)

Session 6 completed multiple baby steps:
1. Verified .gitignore — untracked `AGENT_OPERATING_CONTRACT.md` and added `.DS_Store`
2. Removed unrelated ZionSkank action item from context file (Gemini audit catch)
3. Created and committed `AGENTS.md` with coding agent rules (Gemini audit catch — was missing since first commit)
4. Updated README with `default_policy` explanation and Decision Procedure for Agents (closes Session 5 loop, audited by ChatGPT before committing)
5. Built and committed minimal CLI compliance checker (`cli/check.js`) with three tests — checks schema validation, `disclosure_required`, and `allowed_channels` (Milestone 3A — minimal scaffold; full Tier 1 coverage is Milestone 3B)
6. Added Known Issues / Normative Gaps section to context file
7. Promoted GitHub Actions CI from optional wish-list item to required Milestone 2C (not yet implemented)
8. Established dual audit process: ChatGPT (thinking model) for spec/architecture, Gemini (Pro model) for process/discipline

Session 5 completed Milestone 2A in three baby steps:
1. Fixed date bug (March 6 → March 5) across context file and example JSON
2. Added formal JSON Schema (`schema/agent-venue-rules.schema.json`) — audited by ChatGPT before committing
3. Added schema validation test (`test/validate-schema.js`) wired to `npm test`

Key changes from ChatGPT audit during Session 5:
- Renamed `max_attempts_per_agent` (single object) to `rate_limits` (array) — allows multiple rate limit rules per venue
- Finalized escalation conditions enum with `reservation_modification` (deferred `vip_guest` to v0.2)
- Added `pattern: "^https?://"` to URL fields for stricter validation
- Added `minLength: 1` to `phrasing` field
- Confirmed `disclosure_required` and `allowed_channels` as required fields

Session 4 completed two baby steps:
1. Created the GitHub repo under `selfradiance/restarules` (initially private, later made public)
2. Designed, audited, and committed the v0.1 schema example file

The schema was audited by ChatGPT before committing. Key fixes from the audit:
- Added `default_policy` field ("deny_if_unspecified") to resolve ambiguity about absent fields
- Added `effective_at` date separate from `last_updated`
- Replaced fuzzy string `party_size_above_6` with numeric `party_size_auto_max: 6`
- Specified `action` type in `max_attempts_per_agent` (e.g., "booking_request") with explicit `window_unit`/`window_value`

Several ChatGPT audit recommendations were consciously deferred to v0.2 (channel scoping, typed complaint endpoint, identity verification sub-fields, action scoping, formal JSON Schema validation).

## The Idea: RestaRules

### One-Line Pitch
A restaurant's house rules, but machine-readable — so AI agents know how they're allowed to book, cancel, call, and interact before they do anything.

### Core Concept
A schema and hosting service that lets restaurants publish a `/.well-known/agent-venue-rules.json` file defining their rules for AI agent interactions. Any agent — voice, search, concierge, booking — checks this file before acting. Rules cover disclosure requirements, allowed channels, deposit policies, cancellation windows, retry limits, party-size escalation, and anti-resale constraints.

This is NOT:
- A reservation platform (that's OpenTable/Resy/Tock)
- A bot blocker (that's Cloudflare)
- A voice AI receptionist (that's HostBuddy/Octotable)
- An enterprise agent registry (that's Credal/Microsoft)
- A hospitality booking protocol (that's AgenticBooking)

RestaRules is the **conduct and consent layer** — the rules any agent must obey, independent of which platform or protocol they use.

### Why This Idea Was Chosen
- **The gap is real and verified by three independent AI auditors**: Claude, Gemini, and ChatGPT all confirmed that no product occupies the specific intersection of "venue-authored, portable, machine-readable conduct rules for agent interactions."
- **The timing is right**: New York and Philadelphia have passed anti-bot reservation legislation. The EU AI Act (August 2026) requires AI disclosure. Google's Universal Commerce Protocol launched January 2026. AI voice agents are already calling restaurants. The legal and technical pressure for machine-readable venue policies is building fast.
- **The pain is real and visible**: A Reddit post showed two AI agents stuck in a 2-hour politeness loop at a dentist office, burning API credits. AI booking agents are causing no-shows, scalping reservations, and overwhelming host stands. Restaurants are angry.
- **It's buildable**: The core MVP is a JSON schema, a hosting service, and a reference bot that checks rules before acting. No cutting-edge AI research required.
- **It complements existing players rather than competing with them**: OpenTable/Resy benefit from reduced fraud. Voice AI vendors benefit from a standard config format. AgenticBooking benefits from a conduct layer their booking protocol doesn't cover.
- **It teaches the right skills**: JSON schema design, API development, hosting, potentially Twilio integration for demo, and standards/protocol thinking.
- **Provider-agnostic angle is the moat**: No single reservation platform will build a cross-platform conduct standard. That's the gap no platform will fill.

### Known Risks
1. **Adoption is the hard problem.** Restaurants won't maintain another thing. Mitigation: "paste your house rules, we generate the JSON and host it" — 60-second onboarding.
2. **Agents won't check rules unless it's cheap and deterministic.** Mitigation: `/.well-known/` static file pattern with caching headers. No API calls, no authentication, just a fetch.
3. **Platforms might see it as hostile.** Mitigation: Position as aligned with anti-piracy goals and no-show reduction. Explicitly supports platform enforcement, doesn't replace it.
4. **AgenticBooking could expand into this space.** They're the closest adjacent project (hospitality booking semantics) but currently focused on making venues AI-bookable, not on venue conduct rules. Zero traction as of March 2026 (0 stars, 0 forks). Monitor closely.
5. **Google UCP could absorb this niche.** UCP is focused on retail product commerce today, but is designed to work "across verticals." If UCP expands into service booking with venue conduct rules, the space narrows. Mitigation: move fast, establish the standard for restaurants specifically.
6. **Legal complexity.** RestaRules should not position itself as legal compliance tooling — it's a technical standard, not a law firm.

### James's Conviction (In His Words)
James believes AI trust is on a steep adoption curve. AI agents are already calling businesses, booking reservations, and interacting with the physical economy. The businesses on the receiving end have zero tools to set boundaries. RestaRules gives them a voice — machine-readable, portable, and platform-independent. The wave is forming; RestaRules is positioning to catch it.

## Repo Structure (as of Session 22)

```
restarules/
├── README.md
├── CHANGELOG.md
├── AGENTS.md
├── LICENSE
├── .gitignore
├── .nojekyll
├── package.json
├── .github/
│   └── workflows/
│       └── ci.yml
├── .well-known/
│   └── agent-venue-rules.json
├── examples/
│   ├── the-corner-slice.json
│   ├── omakase-sato.json
│   └── magnolia-garden.json
├── spec/
│   └── restarules-spec.md
├── cli/
│   └── check.js
├── demo/
│   └── voice/
│       ├── index.html
│       ├── app.js
│       ├── sdk-entry.js
│       └── bundle.js
├── reference-agent/
│   ├── agent.js
│   └── decisions.js
├── schema/
│   ├── README.md
│   ├── agent-venue-rules.schema.json
│   └── agent-venue-rules-example.json
├── sdk/
│   ├── README.md
│   ├── index.js
│   ├── validator.js
│   ├── evaluator.js
│   └── schema.json
└── test/
    ├── fixtures/
    │   ├── test-venue-rules.json
    │   ├── test-venue-no-complaint.json
    │   ├── test-venue-with-party-size-policy.json
    │   ├── test-venue-with-deposit.json
    │   ├── test-venue-with-cancellation.json
    │   ├── test-venue-with-no-show.json
    │   ├── test-venue-with-acknowledgment.json
    │   ├── test-venue-with-scoped-rate-limits.json
    │   ├── test-sdk-full-venue.json
    │   ├── test-sdk-minimal-venue.json
    │   ├── test-venue-with-counting-scope.json
    │   ├── test-venue-with-channel-overrides.json
    │   ├── test-venue-with-booking-window.json
    │   ├── test-venue-with-booking-window-no-tz.json
    │   ├── test-venue-with-contradictory-window.json
    │   ├── test-venue-with-ack-skip.json
    │   └── test-venue-with-large-party-channel-conflict.json
    ├── compliance/
    │   ├── README.md
    │   ├── vectors.json
    │   └── validate-vectors.js
    ├── validate-schema.js
    ├── check-compliance.js
    ├── reference-agent.js
    └── sdk-exports.js
```

## Schema Fields

### v0.1 Fields (Required)
- `schema_version`: Version string ("0.1", "0.2", or "0.3")
- `venue_name`: Restaurant name
- `venue_url`: Restaurant website
- `last_updated`: When the file was last edited
- `effective_at`: When the rules take effect
- `default_policy`: "deny_if_unspecified" or "allow_if_unspecified"
- `disclosure_required`: Must AI identify itself? Boolean + phrasing
- `allowed_channels`: Array of permitted channels (phone, web, sms, email, app)

### v0.1 Fields (Optional)
- `rate_limits`: Array of rate limit rules with action type, limit count, time window, and optional `applies_to` action scoping (v0.2)
- `human_escalation_required`: Non-party-size escalation triggers (e.g. `reservation_modification`). Party-size logic moved to `party_size_policy` in v0.2.
- `third_party_restrictions`: No resale, no transfer, identity-bound booking (booleans)
- `complaint_endpoint`: URL for reporting agent misbehavior (informational)

### v0.2 Fields (Optional)
- `venue_currency`: ISO 4217 currency code (e.g. "USD") — metadata
- `venue_timezone`: IANA timezone identifier (e.g. "America/New_York") — metadata
- `party_size_policy`: `auto_book_max` (required), `human_review_above`, `large_party_channels` — permission field
- `deposit_policy`: `required` (boolean), `amount`, `currency`, `refundable` — permission field
- `cancellation_policy`: `penalty_applies`, `window_minutes`, `penalty_amount`, `currency` — informational field
- `no_show_policy`: `fee`, `currency`, `grace_period_minutes` — informational field
- `user_acknowledgment_requirements`: Array of policy names agent must confirm with user — permission field

### v0.3 Fields (Optional)
- `counting_scope`: Optional enum on each rate limit rule — `per_agent` (default), `per_user`, `per_session`. `per_ip` explicitly excluded.
- `allowed_channels_by_action`: Per-action channel overrides. Keys are `$defs.action_type` values, values are channel arrays. Full override semantics (replaces base, not intersection). Empty array = no channels permitted.
- `booking_window`: `min_hours_ahead` (number), `max_days_ahead` (number). Applies to `create_booking` only. Requires `venue_timezone` for enforcement. Absent booking window never blocks (explicit `default_policy` carve-out).

### Shared Definitions ($defs)
- `action_type`: Enum of `check_availability`, `create_booking`, `modify_booking`, `cancel_booking` — used by `rate_limits.applies_to` and as keys in `allowed_channels_by_action`

### Deferred to Future Versions
- Typed complaint endpoint (method, content_type, actor_types)
- Deep identity verification sub-fields
- VIP guest escalation condition
- Cryptographic/evidence-bearing semantics
- Duplicate booking prohibition
- External confirmation requirements
- Conditional deposit applicability
- Tiered cancellation/refund rule arrays

## Known Issues / Normative Gaps

- ~~**Rate limit identity semantics are still undefined**~~ — Resolved in v0.3. `counting_scope` enum (`per_agent`, `per_user`, `per_session`) added to rate limit rules. Default: `per_agent`. `per_ip` explicitly excluded.
- **URL validation is shallow** — pattern checks for `https://` prefix only. Schema does not perform full URL validation. README recommends HTTPS-only.
- ~~**`applies_to` scoping is rate-limits-only**~~ — Partially resolved in v0.3. `allowed_channels_by_action` adds per-action scoping to channels. Other fields (deposit, escalation) remain unscoped. Per-action scoping on other fields deferred to future versions.
- **`user_acknowledgment_requirements` references policy names as strings** — no runtime validation that referenced policies exist. v0.3 improvement: agents now MUST silently ignore absent references (normative behavior defined). But schema-level validation of reference targets is still not enforced.
- ~~**`additionalProperties: false` blocks forward compatibility**~~ — Resolved in Session 22 (Baby Step 1). Top-level `additionalProperties: false` removed; sub-objects remain strict.
- ~~**`$id` references potentially nonexistent domain**~~ — Resolved in Session 22 (Baby Step 2). Changed to GitHub Pages URL.
- ~~**`deposit_policy.amount` scope ambiguous**~~ — Resolved in Session 22 (Baby Step 3). Clarified as per-booking; `amount_basis` field deferred to v0.4.
- ~~**`large_party_channels` / `allowed_channels` step interaction unspecified**~~ — Resolved in Session 22 (Baby Step 4). Spec note updated to reference effective channel list (Steps 3-4). Pinning test added.
- ~~**`effective_at` with no cache unspecified**~~ — Resolved in Session 22 (Baby Step 5). First-fetch guidance added to spec.
- ~~**Dual action vocabulary confusing**~~ — Resolved in Session 22 (Baby Step 6). Dedicated "Action Vocabularies" subsection added to spec Section 4.
- ~~**No compliance test vectors**~~ — Resolved in Session 22 (Baby Steps 7-8). 15 portable test vectors in `test/compliance/`. Linked from spec and README.
- **Party-size migration is one-way** — v0.2 files use `party_size_policy`; v0.1 files used `human_escalation_required.party_size_auto_max`. Both cannot coexist. Migration plan documented in `schema/README.md`.

## Competitive Landscape (Verified March 4, 2026 — Triple-Audited)

### Reservation Platforms (Dominant Incumbents — NOT direct competitors)
- **OpenTable**: Supports anti-piracy legislation, internal fraud teams, deposit enforcement. Platform-specific rules only.
- **Resy/Tock**: Zero-tolerance bot policy, supported NY anti-piracy law. Platform-specific enforcement.
- **SevenRooms**: Deposits as no-show reduction. Platform-specific.
- **Implication**: These enforce rules inside their walled gardens. RestaRules provides cross-platform rules that work outside any single platform.

### Reservation Scalping / Resale (The Adversary Ecosystem)
- **AppointmentTrader**: "Professional sellers" monetizing hard-to-get reservations.
- **NY and Philadelphia anti-piracy laws**: Prohibit unauthorized third-party reservation services.
- **Implication**: Creates the pain RestaRules addresses. Rules like "no third-party booking," "no resale," "bookings tied to identity" directly counter this ecosystem.

### Voice AI / Host-Stand Automation (Fast-Growing, Crowded)
- **HostBuddy, Octotable, and many others**: AI phone answering and booking for restaurants.
- **Implication**: These are potential customers/integrators, not competitors. They could adopt RestaRules as their default config import/export format.

### Big-Tech Agentic Booking (Emerging)
- **Google**: Rolling out agentic restaurant booking via OpenTable/Resy partners.
- **Microsoft Copilot**: "Actions" feature includes restaurant booking via OpenTable.
- **Implication**: Strongest argument that restaurant agent rules become necessary. As big-tech agents book at scale, restaurants need a standardized way to set boundaries.

### Agentic Commerce Standards (Adjacent Infrastructure)
- **Google UCP (Universal Commerce Protocol)**: Open standard for agentic commerce. Co-developed with Shopify, Target, Walmart. Focused on retail product commerce, not restaurant service booking. January 2026.
- **OpenAI/Stripe ACP (Agentic Commerce Protocol)**: Joint standard for agent-driven purchases. Retail-focused.
- **Mastercard Agent Pay**: Agentic payment infrastructure.
- **Implication**: These define how agents transact. RestaRules defines how agents must behave before transacting. Complementary layer.

### AgenticBooking (Closest Adjacent Project)
- **What it is**: Open spec for hospitality booking semantics — venue identity, trust, discovery, availability, booking lifecycle, folio/payments. Led by Selfe (selfe.ai).
- **Status**: Public docs, GitHub repo, draft specs, protocol bindings to A2A/UCP/AP2. BUT: 0 stars, 0 forks, no releases. Very early.
- **Key distinction**: AgenticBooking makes venues AI-bookable (pro-agent infrastructure). RestaRules gives venues control over how agents interact (pro-venue defense). Different purposes.
- **Risk**: Could expand to cover conduct rules. Monitor closely.

### Policy File Standards (Conceptual Analogs)
- **robots.txt**: Machine-readable crawling rules. Conceptual ancestor.
- **llms.txt**: Machine-readable site info for LLMs. Same pattern, different domain.
- **ai.txt**: Academic proposal for AI permissions DSL. Content-focused, not commerce.
- **Cloudflare AI Crawl Control**: Allow/block/charge AI crawlers. Edge traffic control.
- **Implication**: The "policy file" pattern is becoming legible. RestaRules applies it to commerce interactions (restaurants), not content crawling.

### Direct Competitors (Restaurant Agent Conduct Rules)
- **None found as of March 4, 2026.** This specific intersection appears to be unoccupied. Verified independently by Claude, Gemini, and ChatGPT.

## How We Got Here: Ideas Explored and Why They Were Shelved (Sessions 1-3)

### Session 1 Ideas (Original exploration)
1. **Attention Magnifier** — Universal media summarizer. Shelved: NotebookLM and many others dominate.
2. **Pure Signal Aggregator** — AI content filter for HN/Reddit/RSS. Shelved: curator-ai and many monitoring tools exist.
3. **Contract Enforcer** — AI engineering manager for code commits. Shelved: Ambiguous scope, unreliable AI judgment.
4. **AI Reggae Studio Pipeline** — API chaining for music content creation. Shelved: Uncertain API availability, fragile chain.

### Session 2 Ideas — Round 1 (Gemini, "Agent Governance" theme)
5. **AgentBreaker** — Circuit breaker/kill switch for AI agents. Shelved: Extremely crowded.
6. **AgentBadge** — Cryptographic delegation tokens. Shelved: Subset of OAuth 2.0, absorbed by standards.
7. **AgentSwap** — Agent-to-agent escrow. Shelved: Market doesn't exist yet.
8. **AgentReceipts** — Immutable flight recorder for agents. Shelved: AIR Blackbox launched identical concept.
9. **AgentTether** — Semantic policy gate. Shelved: LLM-checking-LLM reliability problem.

### Session 2 Ideas — Round 2 (Gemini, "Sociological/Economic" theme)
10. **Agent Burner Identity** — Privacy proxy for agents. Shelved: Commodity industry, legal gray area.
11. **Agentic Arbiter** — AI-powered escrow judge using Stripe. Shelved: Adoption hurdle too high.
12. **Semantic Tollbooth** — Value-based dynamic API pricing. Shelved: Two-sided marketplace cold-start problem.
13. **Attention Decoy** — Serve fake data to AI scrapers. Shelved: Could poison own SEO, unsolved arms race.
14. **Data Will** — AI memory vault with dead man's switch. Shelved: No programmatic memory export APIs exist for Claude, ChatGPT, or Gemini. Manual-input-only product is too thin.

### Session 3 Ideas — Gemini Round 3
15. **Hallucination Bounty** — Recycled Agentic Arbiter. Same LLM-judging-LLM and marketplace problems.
16. **Cooling-Off Gateway** — Agent action delay with SMS confirmation. Shelved: AgentBudget (loop detection), Twilio A2H (SMS approval protocol), and SupraWall (circuit breakers) already exist.
17. **Semantic Trap Injector, Agentic Miranda Rights, Paywall for Bots** — Recycled ideas from Session 2 (Attention Decoy, AgentBadge, Semantic Tollbooth respectively). Same problems, new names.

### Session 3 Ideas — ChatGPT Round
18. **Agent Venue Rules (narrowed to restaurants)** → Became **RestaRules**. **SELECTED.**
- Also evaluated: Correction Feed for AI Summaries (adoption chicken-and-egg), Preference Wallet (adoption hurdle), Bot License Plate (killed twice already as AgentBadge), Usage Receipts (niche dev tool).

## What RestaRules Needs to Teach James
- JSON schema design (the rules format)
- API development (hosting and serving rules files)
- Web standards patterns (`.well-known/` convention)
- Browser Web Speech API for voice demo (no external accounts or hosting required)
- Potentially: Simple web frontend for restaurant onboarding ("paste your rules, get your JSON")
- Potentially: Cryptographic signing (venue key verification)

## Original MVP Scope (Superseded)

*The original v0.1 scope listed below has been superseded by the Tier 1 / Tier 2 split above (see "Schema v0.1 Fields"). Fields like `deposit_policy`, `cancellation_policy`, and `no_show_policy` were moved to v0.2 during Session 4-5 audits. The Tier 1 list is the authoritative v0.1 scope. This section is preserved for historical context only.*

### Publishing (Milestone 4 — Done)
- ~~Generate hosted page + `/.well-known/agent-venue-rules.json`~~ — Completed Session 10. Demo live at `https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json`. README documents Cache-Control, CORS, and static hosting guidance.
- Optional: sign with venue key (add after MVP)

### Reference Bot Demo (Milestone 5 — Done)
- ~~A simple "booking bot" that fetches rules and refuses to proceed unless rules allow it~~ — Completed Session 11. `reference-agent/agent.js` fetches, validates, and evaluates compliance. `reference-agent/decisions.js` is the extracted, testable decision engine. 20 tests total.

## James's Background (For Context)
- Runs four AI reggae YouTube channels under the ZionSkank brand
- Built AgentGate (collateralized execution engine for AI agents) as first project: 56 milestones, 56 tests, TLS, CI, public manifesto
- Uses Claude Code as primary coding tool. Directs AI agents to write all code.
- Uses Suno for music generation, various AI image tools for visuals.

## Direction Decision (Made Session 12, documented Session 13)

James decided the project follows the **portfolio path, not the business path**. RestaRules is a learning project and portfolio piece, not a product. No monetization, no customers, no sales. Build → Learn → Write about it → Share.

The build sequence going forward:
1. ~~**Milestone 6: v0.2 Schema Design**~~ — **Done (Session 13).** 13 baby steps, 53 tests, schema bumped to v0.2 with full reference agent and CLI support.
2. ~~**Milestone 7: Agent SDK Library**~~ — **Done (Sessions 14-15).** 5 baby steps, 16 SDK tests, npm package with validateRules and evaluateCompliance.
3. ~~**Milestone 8: Browser Voice Demo**~~ — **Done (Session 15).** 10 baby steps, live at GitHub Pages. Agent fetches rules, evaluates compliance, speaks results aloud using Web Speech API. Zero external accounts, zero hosting cost.
4. **After building**: Write articles (Medium, Hacker News, Twitter) about what RestaRules is, why it matters, and what was learned.
5. ~~**v0.3 Schema Design**~~ — **Done (Session 20).** 15 baby steps, 107 tests (now 115 after Session 21 audit fixes). Three features (`counting_scope`, `allowed_channels_by_action`, `booking_window`), one semantic fix (acknowledgment absent-reference handling), full spec/doc/example/demo update.

This sequence was chosen because each step builds on the last: the schema needs to be fuller before you package it, the SDK needs to exist before the voice demo can use it, and the writing comes after there's something complete to write about. Milestone 8 was originally planned as a Twilio voice demo, but pivoted to a browser-based Web Speech API demo during pre-build audit (Session 15) — Twilio added ongoing cost, account maintenance, and hosting complexity that conflicted with the portfolio path. The browser demo proves the same thesis (agent fetches rules, obeys them, you can hear it) with zero infrastructure and free GitHub Pages hosting.

## Next Steps (Future Sessions — RestaRules Foundation Complete)

- **JSON generator web tool** — Separate project. Webpage where restaurant owner fills in a form and gets a valid rules JSON file. The "60-second onboarding" tool.
- **Optional v0.4 schema additions**: `deposit_policy.amount_basis` (per-person vs per-booking), relax `human_escalation_required.conditions` to arbitrary strings, `supported_languages`, `venue_timezone` pattern validation, walk-in-only example venue, multi-location handling guidance
- **Return to AgentGate** and stacking use cases

## Important Notes for Future Claude Sessions
- James has zero prior coding experience and directs AI agents to write all code
- Always take baby steps and explain terminal commands simply
- Claude Code is the primary coding tool — James pastes instructions into Claude Code
- James built AgentGate from scratch using this same process — he knows the workflow, just not the code
- The process template file (uploaded alongside this context file) contains James's full development methodology — read it if you need to understand how he works
- This is James's second project. AgentGate was his first. The same discipline applies here.
- At the end of every session, always update this context file and the README before the final commit
- When James is "jambling" (thinking out loud), don't interrupt with solutions — listen, reflect, wait for him to land on something
- James goes with his heart, not his gut — don't ask about "gut feelings." He makes decisions based on what resonates with his heart. This is how he operates and it's non-negotiable.
- James values accuracy over agreeability — don't be sycophantic, point out false premises, and flag competitive landscapes honestly before letting him commit to building something
- James uses three AI auditors (Claude, Gemini, ChatGPT) to cross-check ideas and competitive landscapes. All major decisions are triple-audited before commitment.
- When sending audit prompts to ChatGPT and Gemini, always verify the strongest/highest-capability model is selected before submitting. Weaker models produce weaker audits. This is easy to forget — check every time.
- James prefers downloadable files over scrolling back through conversation — always provide files to download when giving code to paste into Claude Code. Never ask him to scroll up.
- James keeps only one copy of project context files (in the project folder, e.g. ~/Desktop/restarules). Do not let stale copies accumulate in other folders.

This is a living document. It gets updated as the project progresses.
