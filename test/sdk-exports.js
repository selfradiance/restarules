const assert = require("assert");

// Verify SDK entry point loads without syntax errors
const sdk = require("../sdk/index.js");

// Test 1: validateRules returns validation result for invalid input
const result = sdk.validateRules({});
assert.strictEqual(result.valid, false, "Empty object should not be valid");
assert.ok(Array.isArray(result.errors), "Errors should be an array");
console.log("PASS: validateRules returns validation result for invalid input");

// Test 2: evaluateCompliance returns a result object for allowed channel
const rules = require("../test/fixtures/test-venue-rules.json");
const result2 = sdk.evaluateCompliance(rules, { channel: "phone" });
assert.strictEqual(typeof result2, "object", "evaluateCompliance should return an object");
assert.strictEqual(result2.channel.result, "ALLOWED", "phone should be an allowed channel");
console.log("PASS: evaluateCompliance returns result with allowed channel");

// Test 3: evaluateCompliance denies a channel not in allowed_channels
const result3 = sdk.evaluateCompliance(rules, { channel: "sms" });
assert.strictEqual(result3.channel.result, "DENIED", "sms should be a denied channel");
console.log("PASS: evaluateCompliance denies channel not in allowed_channels");

// Test 4: evaluateCompliance respects default_policy for absent permission fields
const result4 = sdk.evaluateCompliance(rules, { channel: "phone" });
assert.strictEqual(result4.thirdParty.defined, false, "third_party_restrictions should not be defined");
assert.strictEqual(result4.thirdParty.defaultPolicyResult, "DENIED_DEFAULT_POLICY", "absent permission field should be denied with deny_if_unspecified");
console.log("PASS: evaluateCompliance respects default_policy for absent permission fields");
