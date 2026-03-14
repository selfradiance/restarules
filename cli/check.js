#!/usr/bin/env node

/**
 * RestaRules Compliance Checker (v0.1)
 *
 * Evaluates a proposed agent action against a venue's rules file.
 * Checks:
 *   1. Schema validation (is the rules file valid?)
 *   2. disclosure_required (has the agent disclosed it is AI?)
 *   3. allowed_channels (is the intended channel permitted?)
 *   4. rate_limits (has the agent exceeded the attempt limit for this action?)
 *   5. human_escalation_required (does this request require a human?)
 *   6. third_party_restrictions (is the agent acting for a third party?)
 *   7. complaint_endpoint (informational only — not a permission field, not governed by default_policy)
 *
 * Usage:
 *   node cli/check.js --rules <path> --channel <channel> --disclosed <true|false>
 *                     [--action <action>] [--attempt-count <n>]
 *                     [--party-size <n>] [--escalation-condition <condition>]
 *                     [--third-party <true|false>]
 *                     [--target-time <ISO 8601 datetime>]
 *
 * Example:
 *   node cli/check.js --rules schema/agent-venue-rules-example.json --channel phone --disclosed true
 *   node cli/check.js --rules schema/agent-venue-rules-example.json --channel web --disclosed true \
 *     --action create_booking --target-time "2026-03-20T19:00:00-05:00"
 */

const fs = require("fs");
const { validateRules } = require("../sdk/validator");

// --- Argument parsing ---

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) {
      console.error(`Invalid argument: ${key}`);
      process.exit(1);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

function isValidTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

function hasTimezoneOffset(isoString) {
  return /(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(isoString);
}

const args = parseArgs(process.argv);

if (!args.rules || !args.channel || !args.disclosed) {
  console.error(
    "Usage: node cli/check.js --rules <path> --channel <channel> --disclosed <true|false>"
  );
  process.exit(1);
}

const rulesPath = args.rules;
const channel = args.channel;
const disclosed = args.disclosed === "true";

// --- Validate numeric and date inputs ---

if (args["party-size"] !== undefined) {
  const parsed = parseInt(args["party-size"], 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    console.error(`Invalid --party-size: "${args["party-size"]}" — must be a positive integer`);
    process.exit(2);
  }
}

if (args["attempt-count"] !== undefined) {
  const parsed = parseInt(args["attempt-count"], 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.error(`Invalid --attempt-count: "${args["attempt-count"]}" — must be a non-negative integer`);
    process.exit(2);
  }
}

if (args["target-time"] !== undefined) {
  if (isNaN(new Date(args["target-time"]).getTime())) {
    console.error(`Invalid --target-time: "${args["target-time"]}" — must be a valid ISO 8601 datetime`);
    process.exit(2);
  }
}

// --- Load files ---

let rules;
try {
  const raw = fs.readFileSync(rulesPath, "utf8");
  rules = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to load rules file: ${err.message}`);
  process.exit(1);
}

// --- Validate against schema ---

const { valid, errors } = validateRules(rules);

if (!valid) {
  console.log("DENY");
  console.log("reasons:");
  console.log("  - Rules file failed schema validation");
  errors.forEach((err) => {
    console.log(`  - ${err.instancePath || "/"}: ${err.message}`);
  });
  process.exit(2);
}

// --- Evaluate rules ---

const reasons = [];

// Check 1: disclosure_required (Decision Procedure step 2)
if (rules.disclosure_required && rules.disclosure_required.enabled === true) {
  if (!disclosed) {
    reasons.push("disclosure_required is enabled but agent has not disclosed");
  }
}

// Check 2: allowed_channels with per-action override support (Decision Procedure step 3)
if (rules.allowed_channels) {
  let effectiveChannels = rules.allowed_channels;
  let channelSource = "base";
  if (args.action && rules.allowed_channels_by_action && args.action in rules.allowed_channels_by_action) {
    effectiveChannels = rules.allowed_channels_by_action[args.action];
    channelSource = "per_action_override";
  }
  if (!effectiveChannels.includes(channel)) {
    if (channelSource === "per_action_override") {
      reasons.push(
        `Channel "${channel}" is not in allowed_channels_by_action.${args.action} [${effectiveChannels.join(", ")}]`
      );
    } else {
      reasons.push(
        `Channel "${channel}" is not in allowed_channels [${effectiveChannels.join(", ")}]`
      );
    }
  }
} else if (rules.default_policy === "deny_if_unspecified") {
  reasons.push(
    "allowed_channels is absent and default_policy is deny_if_unspecified"
  );
}

// Check 3: rate_limits with applies_to metadata (Decision Procedure step 4)
if (rules.rate_limits) {
  if (args.action !== undefined && args["attempt-count"] !== undefined) {
    const action = args.action;
    const attemptCount = parseInt(args["attempt-count"], 10);
    const matchingLimits = rules.rate_limits.filter((r) => {
      if (r.applies_to && Array.isArray(r.applies_to)) {
        return r.applies_to.includes(action);
      }
      return r.action === action;
    });
    for (const limit of matchingLimits) {
      if (attemptCount >= limit.limit) {
        reasons.push(
          `Rate limit exceeded for "${action}": ${attemptCount} attempts >= limit of ${limit.limit} per ${limit.window_value} ${limit.window_unit}`
        );
      }
    }
  }
} else if (rules.default_policy === "deny_if_unspecified" && args.action !== undefined) {
  reasons.push("rate_limits is absent and default_policy is deny_if_unspecified");
}

// Check 4a: party_size_policy (Decision Procedure step 5a)
if (args["party-size"] !== undefined) {
  const partySize = parseInt(args["party-size"], 10);
  if (rules.party_size_policy) {
    if (partySize > rules.party_size_policy.auto_book_max) {
      reasons.push(
        `Party size ${partySize} exceeds auto_book_max of ${rules.party_size_policy.auto_book_max} — human review required`
      );
    }
  } else if (rules.default_policy === "deny_if_unspecified") {
    reasons.push(
      "party_size_policy is absent and default_policy is deny_if_unspecified"
    );
  }
}

// Check 4b: human_escalation_required — escalation conditions (non-party-size triggers)
if (args["escalation-condition"] !== undefined) {
  if (rules.human_escalation_required) {
    const cond = args["escalation-condition"];
    if (rules.human_escalation_required.conditions.includes(cond)) {
      reasons.push(`Escalation condition "${cond}" requires human handoff`);
    }
  } else if (rules.default_policy === "deny_if_unspecified") {
    reasons.push(
      "human_escalation_required is absent and default_policy is deny_if_unspecified"
    );
  }
}

// Check 5: third_party_restrictions (Decision Procedure step 6)
if (rules.third_party_restrictions) {
  if (args["third-party"] === "true") {
    const r = rules.third_party_restrictions;
    if (r.no_resale || r.no_transfer || r.identity_bound_booking) {
      const active = [];
      if (r.no_resale) active.push("no_resale");
      if (r.no_transfer) active.push("no_transfer");
      if (r.identity_bound_booking) active.push("identity_bound_booking");
      reasons.push(
        `Third-party action denied — restrictions apply: ${active.join(", ")}`
      );
    }
  }
} else if (
  rules.default_policy === "deny_if_unspecified" &&
  args["third-party"] === "true"
) {
  reasons.push(
    "third_party_restrictions is absent and default_policy is deny_if_unspecified"
  );
}

// Check 6: deposit_policy (permission field — governed by default_policy)
if (rules.deposit_policy) {
  if (rules.deposit_policy.required) {
    // Deposit is required — agent must collect before booking. Not a denial, but noted.
  }
} else if (rules.default_policy === "deny_if_unspecified") {
  reasons.push("deposit_policy is absent and default_policy is deny_if_unspecified");
}

// Check 7: user_acknowledgment_requirements (permission field — governed by default_policy)
if (rules.user_acknowledgment_requirements) {
  // Policies the agent must confirm with the user before acting — noted in output.
} else if (rules.default_policy === "deny_if_unspecified") {
  reasons.push("user_acknowledgment_requirements is absent and default_policy is deny_if_unspecified");
}

// Check 8: booking_window (applies to create_booking only; absence never blocks)
// booking_window is NOT governed by default_policy — absence means no time restriction.
if (rules.booking_window && args["target-time"] && args.action === "create_booking") {
  const bw = rules.booking_window;
  // Check for contradictory window (min_hours_ahead >= max_days_ahead * 24)
  const isContradictory = bw.min_hours_ahead !== undefined && bw.max_days_ahead !== undefined &&
    bw.min_hours_ahead >= bw.max_days_ahead * 24;
  if (isContradictory) {
    // Contradictory window — treat as non-actionable, warn instead of deny
    console.log(`  booking_window_warning: Contradictory booking window: min_hours_ahead (${bw.min_hours_ahead}) exceeds max_days_ahead (${bw.max_days_ahead}) converted to hours (${bw.max_days_ahead * 24}). Treating as non-actionable.`);
  } else if (!rules.venue_timezone) {
    // venue_timezone absent — booking_window is informational only, no denial
  } else if (!isValidTimezone(rules.venue_timezone)) {
    // venue_timezone present but invalid — warn, do not enforce
    console.log(`  booking_window_warning: invalid_venue_timezone: "${rules.venue_timezone}" is not a recognized IANA timezone. Treating booking_window as informational only.`);
  } else if (!hasTimezoneOffset(args["target-time"])) {
    // targetTime missing timezone offset — cannot safely compare
    console.log(`  booking_window_warning: target_time_missing_timezone: --target-time must include a timezone offset (Z or +/-HH:MM). Treating booking_window as informational only.`);
  } else {
    // All preconditions met — evaluate with timezone-correct time math
    const now = new Date();
    const target = new Date(args["target-time"]);
    const diffMs = target.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (bw.min_hours_ahead !== undefined && diffHours < bw.min_hours_ahead) {
      reasons.push(
        `Booking is ${diffHours.toFixed(1)} hours ahead, booking_window.min_hours_ahead requires ${bw.min_hours_ahead}`
      );
    }
    if (bw.max_days_ahead !== undefined && diffDays > bw.max_days_ahead) {
      reasons.push(
        `Booking is ${diffDays.toFixed(1)} days ahead, booking_window.max_days_ahead allows ${bw.max_days_ahead}`
      );
    }
  }
}

// cancellation_policy, no_show_policy, and complaint_endpoint are informational fields.
// Their presence or absence never blocks agent actions and is not governed by default_policy.
// Presence is surfaced in output below.

// --- Output result ---

if (reasons.length === 0) {
  console.log("ALLOW");
  console.log("reasons:");
  console.log("  - All checked rules passed");
} else {
  console.log("DENY");
  console.log("reasons:");
  reasons.forEach((r) => console.log(`  - ${r}`));
}

if (rules.allowed_channels_by_action) {
  for (const [action, channels] of Object.entries(rules.allowed_channels_by_action)) {
    console.log(`allowed_channels_by_action: ${action} — [${channels.join(", ")}]`);
  }
}

if (rules.rate_limits) {
  for (const limit of rules.rate_limits) {
    const scope = limit.counting_scope || "per_agent";
    const suffix = limit.counting_scope ? "" : " (default)";
    console.log(`rate_limit_counting_scope: ${limit.action} — ${scope}${suffix}`);
  }
}

if (rules.deposit_policy && rules.deposit_policy.required) {
  const dp = rules.deposit_policy;
  console.log(`deposit_required: ${dp.amount} ${dp.currency || ""}${dp.refundable ? " (refundable)" : " (non-refundable)"}`);
}

if (rules.user_acknowledgment_requirements && rules.user_acknowledgment_requirements.length > 0) {
  const activePolicies = [];
  const skippedPolicies = [];
  for (const policyName of rules.user_acknowledgment_requirements) {
    if (rules[policyName] !== undefined) {
      activePolicies.push(policyName);
    } else {
      skippedPolicies.push(policyName);
    }
  }
  if (activePolicies.length > 0) {
    console.log(`user_acknowledgment_required: ${activePolicies.join(", ")}`);
  }
  for (const skipped of skippedPolicies) {
    console.log(`user_acknowledgment_skipped: ${skipped} (referenced but not defined in rules file)`);
  }
}

if (rules.cancellation_policy) {
  const cp = rules.cancellation_policy;
  if (cp.penalty_applies) {
    console.log(`cancellation_penalty: ${cp.penalty_amount} ${cp.currency || ""} (window: ${cp.window_minutes} minutes)`);
  }
}

if (rules.no_show_policy) {
  const nsp = rules.no_show_policy;
  console.log(`no_show_fee: ${nsp.fee} ${nsp.currency || ""} (grace: ${nsp.grace_period_minutes || 0} minutes)`);
}

if (rules.booking_window) {
  const bw = rules.booking_window;
  const parts = [];
  if (bw.min_hours_ahead !== undefined) parts.push(`min_hours_ahead: ${bw.min_hours_ahead}`);
  if (bw.max_days_ahead !== undefined) parts.push(`max_days_ahead: ${bw.max_days_ahead}`);
  console.log(`booking_window: ${parts.join(", ")}`);
}

if (rules.complaint_endpoint) {
  console.log(`complaint_endpoint: ${rules.complaint_endpoint}`);
}

// Exit code: 0 = ALLOW, 1 = DENY, 2 = invalid input or schema failure
if (reasons.length > 0) {
  process.exit(1);
}
