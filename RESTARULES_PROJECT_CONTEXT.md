# Project #2 — RestaRules: Machine-Readable Agent Conduct Rules for Restaurants
Last updated: 2026-03-06 (Session 4 — Repo Created, Schema v0.1 Committed)
Owner: James Toole
Repo: github.com/selfradiance/restarules (private)
Local folder: ~/Desktop/restarules
Skill level: Beginner — James has no prior coding experience. He directs AI coding agents (Claude Code) to build the project. Explain everything simply. Take baby steps.

## Status: Schema v0.1 Committed — Ready for Milestone 2

Session 4 completed two baby steps:
1. Created the private GitHub repo under `selfradiance/restarules`
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

## Repo Structure (as of Session 4)

```
restarules/
├── README.md
├── .gitignore
└── schema/
    ├── README.md
    └── agent-venue-rules-example.json
```

## Schema v0.1 Fields (Committed)

### Tier 1 — In v0.1 (built and committed)
- `schema_version`: Version string for forward compatibility
- `venue_name`: Restaurant name
- `venue_url`: Restaurant website
- `last_updated`: When the file was last edited
- `effective_at`: When the rules take effect
- `default_policy`: "deny_if_unspecified" or "allow_if_unspecified" — what agents should assume for absent fields
- `disclosure_required`: Must AI identify itself? Boolean + phrasing
- `allowed_channels`: Array of permitted channels (phone, web, sms, email)
- `max_attempts_per_agent`: Rate limit with specific action type, limit count, and time window
- `human_escalation_required`: Numeric party size threshold + condition triggers
- `third_party_restrictions`: No resale, no transfer, identity-bound booking (booleans)
- `complaint_endpoint`: URL for reporting agent misbehavior

### Tier 2 — Deferred to v0.2
- `deposit_policy`: Amount, refundable, window
- `cancellation_policy`: Window, penalty tiers
- `no_show_policy`: Charge amount, grace period
- `party_size_constraints`: Max size for auto-booking, human confirmation threshold
- Channel scoping (discovery vs booking vs cancellation channels)
- Typed complaint endpoint (method, content_type, actor_types)
- Identity verification sub-fields
- Action scoping (which rules apply to which actions)
- Formal JSON Schema validation file
- Canonical vocabulary/enum definitions

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
- Potentially: Twilio API for voice agent demo
- Potentially: Simple web frontend for restaurant onboarding ("paste your rules, get your JSON")
- Potentially: Cryptographic signing (venue key verification)

## Planned MVP Scope (v0.1)

### Schema v0.1 Fields
- `disclosure_required`: Must AI caller identify itself? (boolean + phrasing)
- `allowed_channels`: web / phone / sms / email (array)
- `deposit_policy`: required? amount? refundable? window?
- `cancellation_policy`: window, penalty tiers
- `no_show_policy`: charge amount, grace period
- `max_attempts_per_agent`: rate limit per agent per hour
- `party_size_constraints`: max size for auto-booking, human confirmation threshold
- `human_escalation_required`: conditions requiring human handoff
- `third_party_restrictions`: no resale, no transfer, bookings tied to identity
- `complaint_endpoint`: where to report agent misbehavior
- `schema_version`: for forward compatibility

### Publishing
- Generate hosted page + `/.well-known/agent-venue-rules.json`
- Optional: sign with venue key (add after MVP)

### Reference Bot Demo
- A simple "booking bot" that fetches rules and refuses to proceed unless rules allow it
- Logs compliance decisions
- Proves the thesis: agents can check rules before acting

## James's Background (For Context)
- Runs four AI reggae YouTube channels under the ZionSkank brand
- Built AgentGate (collateralized execution engine for AI agents) as first project: 56 milestones, 56 tests, TLS, CI, public manifesto
- Uses Claude Code as primary coding tool. Directs AI agents to write all code.
- Uses Suno for music generation, various AI image tools for visuals.

## Separate Action Item (Not a Coding Project)
James identified that his YouTube channel workflows live entirely in his head. He should spend an afternoon creating dedicated project context files for each ZionSkank channel — brand rules, Suno style prompts, visual guidelines, correct hashtags, video format specs. This is a documentation task, not a software project, but it will reduce friction significantly.

## Next Steps (For Next Session)
- Define Milestone 2: what comes after the schema example file
- Likely candidates: formal JSON Schema definition file, or the reference bot demo, or the hosting service
- Continue baby-step build process using Claude Code
- Triple-audit any major design decisions

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

This is a living document. It gets updated as the project progresses.
