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
 *
 * Example:
 *   node cli/check.js --rules schema/agent-venue-rules-example.json --channel phone --disclosed true
 */

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

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

// --- Load files ---

let rules;
try {
  const raw = fs.readFileSync(rulesPath, "utf8");
  rules = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to load rules file: ${err.message}`);
  process.exit(1);
}

let schema;
try {
  const schemaPath = path.join(__dirname, "..", "schema", "agent-venue-rules.schema.json");
  const raw = fs.readFileSync(schemaPath, "utf8");
  schema = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to load schema: ${err.message}`);
  process.exit(1);
}

// --- Validate against schema ---

const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const valid = validate(rules);

if (!valid) {
  console.log("DENY");
  console.log("reasons:");
  console.log("  - Rules file failed schema validation");
  validate.errors.forEach((err) => {
    console.log(`  - ${err.instancePath || "/"}: ${err.message}`);
  });
  process.exit(0);
}

// --- Evaluate rules ---

const reasons = [];

// Check 1: disclosure_required (Decision Procedure step 2)
if (rules.disclosure_required && rules.disclosure_required.enabled === true) {
  if (!disclosed) {
    reasons.push("disclosure_required is enabled but agent has not disclosed");
  }
}

// Check 2: allowed_channels (Decision Procedure step 3)
if (rules.allowed_channels) {
  if (!rules.allowed_channels.includes(channel)) {
    reasons.push(
      `Channel "${channel}" is not in allowed_channels [${rules.allowed_channels.join(", ")}]`
    );
  }
} else if (rules.default_policy === "deny_if_unspecified") {
  reasons.push(
    "allowed_channels is absent and default_policy is deny_if_unspecified"
  );
}

// Check 3: rate_limits (Decision Procedure step 4)
if (rules.rate_limits) {
  if (args.action !== undefined && args["attempt-count"] !== undefined) {
    const action = args.action;
    const attemptCount = parseInt(args["attempt-count"], 10);
    const matchingLimits = rules.rate_limits.filter((r) => r.action === action);
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

// complaint_endpoint is informational — not a permission field.
// Its presence or absence never blocks agent actions and is not governed by default_policy.
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

if (rules.complaint_endpoint) {
  console.log(`complaint_endpoint: ${rules.complaint_endpoint}`);
}
