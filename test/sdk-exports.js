const assert = require("assert");

// Verify SDK entry point loads without syntax errors
const sdk = require("../sdk/index.js");

// Test 1: validateRules returns validation result for invalid input
const result = sdk.validateRules({});
assert.strictEqual(result.valid, false, "Empty object should not be valid");
assert.ok(Array.isArray(result.errors), "Errors should be an array");
console.log("PASS: validateRules returns validation result for invalid input");

// Test 2: evaluateCompliance is exported and throws expected stub error
let threw = false;
try {
  sdk.evaluateCompliance({}, {});
} catch (err) {
  threw = true;
  assert.ok(
    err.message.includes("Not yet implemented"),
    "evaluateCompliance should throw 'Not yet implemented' error"
  );
}
assert.ok(threw, "evaluateCompliance should throw");
console.log("PASS: evaluateCompliance exports and throws expected stub error");
