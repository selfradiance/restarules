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

console.log("\nAll compliance checker tests passed.");
