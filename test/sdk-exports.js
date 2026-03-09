const assert = require("assert");

// Verify SDK entry point loads without syntax errors
const sdk = require("../sdk/index.js");

// Test 1: validateRules is exported and throws expected stub error
let threw = false;
try {
  sdk.validateRules({});
} catch (err) {
  threw = true;
  assert.ok(
    err.message.includes("Not yet implemented"),
    "validateRules should throw 'Not yet implemented' error"
  );
}
assert.ok(threw, "validateRules should throw");
console.log("PASS: validateRules exports and throws expected stub error");

// Test 2: evaluateCompliance is exported and throws expected stub error
threw = false;
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
