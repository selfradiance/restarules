/**
 * Validates portable compliance test vectors against the reference implementation.
 *
 * Loads vectors.json and runs each vector through schema validation (Ajv) and/or
 * the SDK evaluateCompliance function, then asserts the result matches expected.
 */

const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const { evaluateCompliance } = require("../../sdk/evaluator");
const schema = require("../../schema/agent-venue-rules.schema.json");
const vectors = require("./vectors.json");

const ajv = new Ajv();
addFormats(ajv);
const validate = ajv.compile(schema);

let passed = 0;
let failed = 0;

function assert(id, description, condition) {
  if (condition) {
    console.log(`PASS: ${id} — ${description}`);
    passed++;
  } else {
    console.error(`FAIL: ${id} — ${description}`);
    failed++;
  }
}

for (const v of vectors) {
  const { id, description, check, input, expected } = v;
  const params = input.params || {};

  if (check === "schema_validation") {
    // Step 1: validate against schema — expect failure
    const valid = validate(input.rules);
    assert(id, description, expected.permitted === false ? !valid : valid);
    continue;
  }

  // All other checks use the evaluator
  const result = evaluateCompliance(input.rules, params);

  switch (check) {
    case "channel": {
      const channelResult = result.channel.result;
      if (expected.permitted === true) {
        assert(id, description, channelResult === "ALLOWED");
      } else {
        assert(id, description, channelResult === "DENIED");
      }
      break;
    }

    case "party_size": {
      const psResult = result.partySize.result;
      if (expected.permitted === true) {
        assert(id, description, psResult === "ALLOWED");
      } else {
        assert(id, description, psResult === "ESCALATE_TO_HUMAN" || psResult === "DENIED_DEFAULT_POLICY");
      }
      break;
    }

    case "booking_window": {
      const bwResult = result.bookingWindow;
      if (expected.permitted === "not_evaluated") {
        assert(id, description, bwResult.result === "NOT_EVALUATED" && bwResult.enforced === false);
      } else if (expected.permitted === true) {
        assert(id, description, bwResult.result === "ALLOWED");
      } else {
        assert(id, description, bwResult.result === "DENIED");
      }
      break;
    }

    case "deposit_policy": {
      const dp = result.depositPolicy;
      assert(id, description,
        dp.defined === true &&
        dp.required === expected.deposit.required &&
        dp.amount === expected.deposit.amount
      );
      break;
    }

    case "default_policy": {
      // Check that the absent permission field produced the correct default_policy result
      const field = input.absent_field;
      let dpResult;
      if (field === "deposit_policy") {
        dpResult = result.depositPolicy.defaultPolicyResult;
      } else if (field === "third_party_restrictions") {
        dpResult = result.thirdParty.defaultPolicyResult;
      } else if (field === "party_size_policy") {
        dpResult = result.partySize.result;
      }
      if (expected.permitted === true) {
        assert(id, description, dpResult === "ALLOWED");
      } else {
        assert(id, description, dpResult === "DENIED_DEFAULT_POLICY");
      }
      break;
    }

    case "all_pass": {
      assert(id, description,
        result.channel.result === "ALLOWED" &&
        result.partySize.result === "ALLOWED" &&
        result.bookingWindow.result === "ALLOWED"
      );
      break;
    }

    default:
      console.error(`FAIL: ${id} — unknown check type: ${check}`);
      failed++;
  }
}

console.log(`\nCompliance vector tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
