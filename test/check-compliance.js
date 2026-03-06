const { execSync } = require("child_process");
const path = require("path");

const cliPath = path.join(__dirname, "..", "cli", "check.js");
const exampleRules = path.join(
  __dirname,
  "..",
  "schema",
  "agent-venue-rules-example.json"
);

function run(args) {
  const cmd = `node ${cliPath} --rules ${exampleRules} ${args}`;
  return execSync(cmd, { encoding: "utf8" });
}

// Test 1: ALLOW — disclosed agent using an allowed channel
try {
  const output = run("--channel phone --disclosed true");
  if (output.includes("ALLOW")) {
    console.log(
      "PASS: Disclosed agent on allowed channel gets ALLOW"
    );
  } else {
    console.error(
      "FAIL: Expected ALLOW for disclosed agent on allowed channel"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on ALLOW test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 2: DENY — undisclosed agent (disclosure_required is enabled in example)
try {
  const output = run("--channel phone --disclosed false");
  if (output.includes("DENY") && output.includes("disclosure_required")) {
    console.log(
      "PASS: Undisclosed agent gets DENY with disclosure reason"
    );
  } else {
    console.error(
      "FAIL: Expected DENY with disclosure reason for undisclosed agent"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on DENY test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 3: DENY — disclosed agent on a disallowed channel
try {
  const output = run("--channel sms --disclosed true");
  if (output.includes("DENY") && output.includes("allowed_channels")) {
    console.log(
      "PASS: Agent on disallowed channel gets DENY with channel reason"
    );
  } else {
    console.error(
      "FAIL: Expected DENY with channel reason for disallowed channel"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on channel DENY test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 4: ALLOW — rate limit not exceeded (2 attempts, limit is 3)
try {
  const output = run("--channel phone --disclosed true --action booking_request --attempt-count 2");
  if (output.includes("ALLOW")) {
    console.log(
      "PASS: Agent within rate limit gets ALLOW"
    );
  } else {
    console.error(
      "FAIL: Expected ALLOW for agent within rate limit"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on rate limit ALLOW test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 5: DENY — rate limit exceeded (3 attempts, limit is 3)
try {
  const output = run("--channel phone --disclosed true --action booking_request --attempt-count 3");
  if (output.includes("DENY") && output.includes("Rate limit exceeded")) {
    console.log(
      "PASS: Agent exceeding rate limit gets DENY with rate limit reason"
    );
  } else {
    console.error(
      "FAIL: Expected DENY with rate limit reason for exceeded attempt count"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on rate limit DENY test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 6: ALLOW — party size within auto-max (5, max is 6)
try {
  const output = run("--channel phone --disclosed true --party-size 5");
  if (output.includes("ALLOW")) {
    console.log(
      "PASS: Party size within auto-max gets ALLOW"
    );
  } else {
    console.error(
      "FAIL: Expected ALLOW for party size within auto-max"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on party size ALLOW test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 7: DENY — party size exceeds auto-max (8, max is 6)
try {
  const output = run("--channel phone --disclosed true --party-size 8");
  if (output.includes("DENY") && output.includes("party_size_auto_max")) {
    console.log(
      "PASS: Party size exceeding auto-max gets DENY with escalation reason"
    );
  } else {
    console.error(
      "FAIL: Expected DENY with escalation reason for oversized party"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on party size DENY test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 8: DENY — escalation condition triggered
try {
  const output = run("--channel phone --disclosed true --escalation-condition special_event_booking");
  if (output.includes("DENY") && output.includes("human handoff")) {
    console.log(
      "PASS: Triggered escalation condition gets DENY with handoff reason"
    );
  } else {
    console.error(
      "FAIL: Expected DENY with handoff reason for escalation condition"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on escalation condition DENY test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 9: DENY — agent acting as third party (all restrictions enabled in example)
try {
  const output = run("--channel phone --disclosed true --third-party true");
  if (output.includes("DENY") && output.includes("Third-party action denied")) {
    console.log(
      "PASS: Third-party agent gets DENY with restriction reason"
    );
  } else {
    console.error(
      "FAIL: Expected DENY with restriction reason for third-party agent"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on third-party DENY test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 10: ALLOW — agent not acting as third party
try {
  const output = run("--channel phone --disclosed true --third-party false");
  if (output.includes("ALLOW")) {
    console.log(
      "PASS: Non-third-party agent gets ALLOW"
    );
  } else {
    console.error(
      "FAIL: Expected ALLOW for non-third-party agent"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on third-party ALLOW test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 11: complaint_endpoint surfaced in output when present
try {
  const output = run("--channel phone --disclosed true");
  if (output.includes("complaint_endpoint")) {
    console.log(
      "PASS: Complaint endpoint is surfaced in output when present"
    );
  } else {
    console.error(
      "FAIL: Expected complaint_endpoint to appear in output"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on complaint_endpoint test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 12: missing complaint_endpoint with deny_if_unspecified does NOT produce a denial
try {
  const noComplaintRules = path.join(__dirname, "fixtures", "test-venue-no-complaint.json");
  const cmd = `node ${cliPath} --rules ${noComplaintRules} --channel phone --disclosed true`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (output.includes("ALLOW") && !output.includes("complaint_endpoint is absent")) {
    console.log(
      "PASS: Missing complaint_endpoint with deny_if_unspecified does not produce denial"
    );
  } else {
    console.error(
      "FAIL: Expected ALLOW with no complaint_endpoint denial for missing complaint_endpoint"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on complaint_endpoint absence test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

console.log("\nAll compliance checker tests passed.");
