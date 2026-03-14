#!/usr/bin/env node

const { evaluateCompliance } = require("./decisions");
const { validateRules } = require("../sdk/validator");

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

  const { valid, errors } = validateRules(rules);
  if (!valid) {
    console.error("✗ Schema validation failed:");
    for (const error of errors) {
      console.error(`  - ${error.instancePath || "(root)"}: ${error.message}`);
    }
    process.exit(1);
  }

  console.log("✓ Schema validation passed\n");

  if (!hasFlags) {
    console.log(JSON.stringify(rules, null, 2));
    return;
  }

  const report = evaluateCompliance(rules, { channel, partySize, action, attempts });

  console.log("--- Compliance Report ---\n");
  console.log(`Venue: ${rules.venue_name}`);
  console.log(`Default policy: ${rules.default_policy}\n`);

  // 1. Disclosure
  if (report.disclosure.required) {
    console.log(`1. Disclosure required: YES`);
    if (report.disclosure.phrasing) {
      console.log(`   Phrasing: "${report.disclosure.phrasing}"`);
    }
  } else {
    console.log(`1. Disclosure required: NO`);
  }
  console.log();

  // 2. Channel check
  if (channel) {
    if (report.channel.result === "ALLOWED") {
      console.log(`2. Channel check (${channel}): ALLOWED`);
    } else {
      console.log(`2. Channel check (${channel}): DENIED — not in allowed channels`);
      console.log(`   Allowed: ${report.channel.allowedChannels.join(", ")}`);
    }
  } else {
    console.log(`2. Channel check: (no channel provided)`);
    console.log(`   Allowed channels: ${report.channel.allowedChannels ? report.channel.allowedChannels.join(", ") : "not defined"}`);
  }
  console.log();

  // 3. Party size
  if (partySize !== null) {
    if (report.partySize.result === "ESCALATE_TO_HUMAN") {
      console.log(`3. Party size check (${partySize}):`);
      console.log(`   Auto-max: ${report.partySize.autoMax}`);
      console.log(`   Result: ESCALATE TO HUMAN`);
    } else if (report.partySize.result === "ALLOWED") {
      console.log(`3. Party size check (${partySize}):`);
      console.log(`   Auto-max: ${report.partySize.autoMax}`);
      console.log(`   Result: ALLOWED — no escalation needed`);
    } else {
      console.log(`3. Party size check (${partySize}): ${report.partySize.result} — human_escalation_required not defined, applying default_policy`);
    }
    if (report.escalationConditions && report.escalationConditions.length > 0) {
      console.log(`   Escalation conditions also defined: ${report.escalationConditions.join(", ")}`);
    }
  } else {
    if (report.partySize && report.partySize.autoMax !== null) {
      console.log(`3. Party size check: (no party size provided)`);
      console.log(`   Auto-max: ${report.partySize.autoMax}`);
      if (report.escalationConditions && report.escalationConditions.length > 0) {
        console.log(`   Escalation conditions: ${report.escalationConditions.join(", ")}`);
      }
    } else {
      const fallback = rules.default_policy === "allow_if_unspecified" ? "allow" : "deny";
      console.log(`3. Party size check: human_escalation_required not defined — default_policy will ${fallback}`);
    }
  }
  console.log();

  // 4. Rate limits
  if (action && attempts !== null) {
    if (report.rateLimit.result === "WITHIN_LIMITS") {
      console.log(`4. Rate limit check (${action}, attempt ${attempts}):`);
      console.log(`   Limit: ${report.rateLimit.limit} per ${report.rateLimit.windowValue} ${report.rateLimit.windowUnit}`);
      console.log(`   Result: WITHIN LIMITS`);
    } else if (report.rateLimit.result === "EXCEEDED") {
      console.log(`4. Rate limit check (${action}, attempt ${attempts}):`);
      console.log(`   Limit: ${report.rateLimit.limit} per ${report.rateLimit.windowValue} ${report.rateLimit.windowUnit}`);
      console.log(`   Result: EXCEEDED`);
    } else {
      const label = report.rateLimit.result === "WITHIN_LIMITS_DEFAULT_POLICY" ? "WITHIN LIMITS" : "DENIED";
      const reason = rules.rate_limits ? "no rule defined for this action" : "rate_limits not defined";
      console.log(`4. Rate limit check (${action}, attempt ${attempts}): ${label} — ${reason}, applying default_policy`);
    }
  } else {
    if (rules.rate_limits) {
      console.log(`4. Rate limits: ${rules.rate_limits.length} rule(s) defined`);
      for (const r of rules.rate_limits) {
        console.log(`   - ${r.action}: max ${r.limit} per ${r.window_value} ${r.window_unit}`);
      }
    } else {
      const fallback = rules.default_policy === "allow_if_unspecified" ? "allow" : "deny";
      console.log(`4. Rate limits: not defined — default_policy will ${fallback}`);
    }
  }
  console.log();

  // 5. Third-party restrictions
  if (report.thirdParty.defined) {
    console.log(`5. Third-party restrictions:`);
    console.log(`   No resale: ${report.thirdParty.noResale}`);
    console.log(`   No transfer: ${report.thirdParty.noTransfer}`);
    console.log(`   Identity-bound booking: ${report.thirdParty.identityBound}`);
  } else {
    const fallback = report.thirdParty.defaultPolicyResult === "ALLOWED" ? "no restrictions apply" : "all third-party actions denied";
    console.log(`5. Third-party restrictions: not defined — default_policy: ${fallback}`);
  }
  console.log();

  // 6. Complaint endpoint
  if (report.complaintEndpoint) {
    console.log(`6. Complaint endpoint: ${report.complaintEndpoint}`);
  } else {
    console.log(`6. Complaint endpoint: not defined`);
  }
})();
