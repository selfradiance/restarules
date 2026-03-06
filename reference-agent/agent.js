#!/usr/bin/env node

const path = require("path");
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const schema = require(path.resolve(__dirname, "..", "schema", "agent-venue-rules.schema.json"));

const ajv = new Ajv();
addFormats(ajv);
const validate = ajv.compile(schema);

// Parse arguments: first positional arg is URL, remaining are --flag value pairs
const args = process.argv.slice(2);
const url = args[0] && !args[0].startsWith("--") ? args[0] : null;

if (!url) {
  console.error("Usage: node reference-agent/agent.js <rules-url> [--channel <channel>] [--party-size <number>] [--action <action-type>] [--attempts <number>]");
  process.exit(1);
}

const flags = {};
for (let i = 1; i < args.length; i++) {
  if (args[i].startsWith("--") && i + 1 < args.length) {
    flags[args[i].slice(2)] = args[i + 1];
    i++;
  }
}

const channel = flags["channel"] || null;
const partySize = flags["party-size"] ? parseInt(flags["party-size"], 10) : null;
const action = flags["action"] || null;
const attempts = flags["attempts"] ? parseInt(flags["attempts"], 10) : null;

const hasFlags = channel || partySize !== null || action || attempts !== null;

(async () => {
  console.log(`Fetching rules from: ${url}`);

  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error(`✗ Failed to fetch rules: ${err.message}`);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`✗ Failed to fetch rules: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  let rules;
  try {
    rules = await response.json();
  } catch (err) {
    console.error(`✗ Response is not valid JSON: ${err.message}`);
    process.exit(1);
  }

  console.log(`✓ Rules loaded for venue: ${rules.venue_name}`);

  const valid = validate(rules);
  if (!valid) {
    console.error("✗ Schema validation failed:");
    for (const error of validate.errors) {
      console.error(`  - ${error.instancePath || "(root)"}: ${error.message}`);
    }
    process.exit(1);
  }

  console.log("✓ Schema validation passed\n");

  if (!hasFlags) {
    console.log(JSON.stringify(rules, null, 2));
    return;
  }

  // --- Compliance Report ---
  const dp = rules.default_policy;

  console.log("--- Compliance Report ---\n");
  console.log(`Venue: ${rules.venue_name}`);
  console.log(`Default policy: ${dp}\n`);

  // 1. Disclosure
  const disc = rules.disclosure_required;
  if (disc.enabled) {
    console.log(`1. Disclosure required: YES`);
    if (disc.phrasing) {
      console.log(`   Phrasing: "${disc.phrasing}"`);
    }
  } else {
    console.log(`1. Disclosure required: NO`);
  }
  console.log();

  // 2. Channel check
  if (channel) {
    if (rules.allowed_channels) {
      if (rules.allowed_channels.includes(channel)) {
        console.log(`2. Channel check (${channel}): ALLOWED`);
      } else {
        console.log(`2. Channel check (${channel}): DENIED — not in allowed channels`);
        console.log(`   Allowed: ${rules.allowed_channels.join(", ")}`);
      }
    } else {
      const decision = dp === "allow_if_unspecified" ? "ALLOWED" : "DENIED";
      console.log(`2. Channel check (${channel}): ${decision} — allowed_channels not defined, applying default_policy`);
    }
  } else {
    console.log(`2. Channel check: (no channel provided)`);
    console.log(`   Allowed channels: ${rules.allowed_channels ? rules.allowed_channels.join(", ") : "not defined"}`);
  }
  console.log();

  // 3. Party size
  if (partySize !== null) {
    if (rules.human_escalation_required) {
      const autoMax = rules.human_escalation_required.party_size_auto_max;
      const conditions = rules.human_escalation_required.conditions;
      console.log(`3. Party size check (${partySize}):`);
      console.log(`   Auto-max: ${autoMax}`);
      if (partySize > autoMax) {
        console.log(`   Result: ESCALATE TO HUMAN`);
      } else {
        console.log(`   Result: ALLOWED — no escalation needed`);
      }
      if (conditions && conditions.length > 0) {
        console.log(`   Escalation conditions also defined: ${conditions.join(", ")}`);
      }
    } else {
      const decision = dp === "allow_if_unspecified" ? "ALLOWED" : "DENIED";
      console.log(`3. Party size check (${partySize}): ${decision} — human_escalation_required not defined, applying default_policy`);
    }
  } else {
    if (rules.human_escalation_required) {
      console.log(`3. Party size check: (no party size provided)`);
      console.log(`   Auto-max: ${rules.human_escalation_required.party_size_auto_max}`);
      if (rules.human_escalation_required.conditions.length > 0) {
        console.log(`   Escalation conditions: ${rules.human_escalation_required.conditions.join(", ")}`);
      }
    } else {
      const fallback = dp === "allow_if_unspecified" ? "allow" : "deny";
      console.log(`3. Party size check: human_escalation_required not defined — default_policy will ${fallback}`);
    }
  }
  console.log();

  // 4. Rate limits
  if (action && attempts !== null) {
    if (rules.rate_limits) {
      const match = rules.rate_limits.find((r) => r.action === action);
      if (match) {
        console.log(`4. Rate limit check (${action}, attempt ${attempts}):`);
        console.log(`   Limit: ${match.limit} per ${match.window_value} ${match.window_unit}`);
        if (attempts >= match.limit) {
          console.log(`   Result: EXCEEDED`);
        } else {
          console.log(`   Result: WITHIN LIMITS`);
        }
      } else {
        const decision = dp === "allow_if_unspecified" ? "WITHIN LIMITS" : "DENIED";
        console.log(`4. Rate limit check (${action}, attempt ${attempts}): ${decision} — no rule defined for this action, applying default_policy`);
      }
    } else {
      const decision = dp === "allow_if_unspecified" ? "WITHIN LIMITS" : "DENIED";
      console.log(`4. Rate limit check (${action}, attempt ${attempts}): ${decision} — rate_limits not defined, applying default_policy`);
    }
  } else {
    if (rules.rate_limits) {
      console.log(`4. Rate limits: ${rules.rate_limits.length} rule(s) defined`);
      for (const r of rules.rate_limits) {
        console.log(`   - ${r.action}: max ${r.limit} per ${r.window_value} ${r.window_unit}`);
      }
    } else {
      const fallback = dp === "allow_if_unspecified" ? "allow" : "deny";
      console.log(`4. Rate limits: not defined — default_policy will ${fallback}`);
    }
  }
  console.log();

  // 5. Third-party restrictions
  if (rules.third_party_restrictions) {
    const tpr = rules.third_party_restrictions;
    console.log(`5. Third-party restrictions:`);
    console.log(`   No resale: ${tpr.no_resale}`);
    console.log(`   No transfer: ${tpr.no_transfer}`);
    console.log(`   Identity-bound booking: ${tpr.identity_bound_booking}`);
  } else {
    const fallback = dp === "allow_if_unspecified" ? "no restrictions apply" : "all third-party actions denied";
    console.log(`5. Third-party restrictions: not defined — default_policy: ${fallback}`);
  }
  console.log();

  // 6. Complaint endpoint
  if (rules.complaint_endpoint) {
    console.log(`6. Complaint endpoint: ${rules.complaint_endpoint}`);
  } else {
    console.log(`6. Complaint endpoint: not defined`);
  }
})();
