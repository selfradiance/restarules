#!/usr/bin/env node

/**
 * RestaRules Compliance Checker (v0.0)
 *
 * Evaluates a proposed agent action against a venue's rules file.
 * Currently checks:
 *   1. Schema validation (is the rules file valid?)
 *   2. disclosure_required (has the agent disclosed it is AI?)
 *   3. allowed_channels (is the intended channel permitted?)
 *
 * Usage:
 *   node cli/check.js --rules <path> --channel <channel> --disclosed <true|false>
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
