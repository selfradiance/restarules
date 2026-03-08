# AGENTS.md — Rules for AI Coding Agents

This file defines the working agreement for any AI coding agent contributing to this project.

## The Loop (Every Change)

1. Read the project context file before making any changes
2. Make the smallest safe change — one concern per diff
3. Run all tests (`npm test`), not just the ones you think are relevant
4. Verify the change works — "it should work" is not verification
5. Commit with a clear message describing what changed
6. Push to GitHub immediately — do not leave commits unpushed
7. Update documentation if anything significant changed

## Rules

- Never weaken security to move faster
- Never skip verification
- Never modify files outside the scope of the current task
- Never delete tests
- Never commit secrets, API keys, or credentials
- Never refactor code that isn't related to the current task
- Never add features that weren't asked for
- Never change architecture without explicit approval
- If something seems wrong, ask — don't guess
- If a change would break something, warn before making it

## Communication

- Explain what you changed and why, in plain language
- If you encounter something unexpected, say so immediately
- Don't silently skip steps or make assumptions

## Verification

- Check for ghost processes before debugging logic
- After deployment, verify the deployed version matches what was tested locally
- Every output must be confirmed working before reporting a task as complete
- If the schema changes, validate the example file in tests

## Process Template v3 Requirements

The project context file must include three sections:
- **Assumptions & Unknowns** — what we're assuming to be true and what we don't yet know
- **Confidence Tags** — a confidence level on key decisions. Five levels: Idea (sounds right, haven't tested), Prototype (built it, works in demo path), Tested (tests exist and pass), Production (deployed, hardened, verified from outside), Security-verified (red-teamed and survived)
- **Decision Log** — a running log of significant decisions made and why

## Before Starting Any New Feature or Phase (Part 1C)

Before writing any code, define:
- What we're building
- What problem it solves
- What the smallest version is
- What's out of scope

No code until this is written down.

## Files That Must Never Be Committed

- `*_PROJECT_CONTEXT.md` — private session history and project state
- `AGENT_OPERATING_CONTRACT.md` — private workflow document
- `process-template*.md` — private development methodology
- `.env` — environment variables and secrets
- `.DS_Store` — macOS system files

These must be listed in `.gitignore` before the first commit of any new project.
