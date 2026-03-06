#!/usr/bin/env node

const path = require("path");
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const schema = require(path.resolve(__dirname, "..", "schema", "agent-venue-rules.schema.json"));

const ajv = new Ajv();
addFormats(ajv);
const validate = ajv.compile(schema);

const url = process.argv[2];

if (!url) {
  console.error("Usage: node reference-agent/agent.js <rules-url>");
  process.exit(1);
}

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
  console.log(JSON.stringify(rules, null, 2));
})();
