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
  if (output.includes("DENY") && output.includes("auto_book_max")) {
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

// Test 13: deposit_required is surfaced in CLI output (Golden Fork has deposit_policy)
try {
  const output = run("--channel phone --disclosed true");
  if (output.includes("deposit_required")) {
    console.log(
      "PASS: deposit_required is surfaced in CLI output when deposit_policy present"
    );
  } else {
    console.error(
      "FAIL: Expected deposit_required to appear in output"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on deposit_required test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 14: user_acknowledgment_required is surfaced in CLI output
try {
  const output = run("--channel phone --disclosed true");
  if (output.includes("user_acknowledgment_required") && output.includes("deposit_policy")) {
    console.log(
      "PASS: user_acknowledgment_required is surfaced with policy names"
    );
  } else {
    console.error(
      "FAIL: Expected user_acknowledgment_required with policy names in output"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on user_acknowledgment test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 15: cancellation_penalty is surfaced in CLI output (informational)
try {
  const output = run("--channel phone --disclosed true");
  if (output.includes("cancellation_penalty")) {
    console.log(
      "PASS: cancellation_penalty is surfaced in CLI output"
    );
  } else {
    console.error(
      "FAIL: Expected cancellation_penalty to appear in output"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on cancellation_penalty test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 16: no_show_fee is surfaced in CLI output (informational)
try {
  const output = run("--channel phone --disclosed true");
  if (output.includes("no_show_fee")) {
    console.log(
      "PASS: no_show_fee is surfaced in CLI output"
    );
  } else {
    console.error(
      "FAIL: Expected no_show_fee to appear in output"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on no_show_fee test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 17: DENY — deposit_policy absent with deny_if_unspecified
try {
  const noDepositRules = path.join(__dirname, "fixtures", "test-venue-with-no-show.json");
  const cmd = `node ${cliPath} --rules ${noDepositRules} --channel phone --disclosed true`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (output.includes("DENY") && output.includes("deposit_policy is absent")) {
    console.log(
      "PASS: Missing deposit_policy with deny_if_unspecified produces DENY"
    );
  } else {
    console.error(
      "FAIL: Expected DENY with deposit_policy absence reason"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on deposit_policy absence test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 18: counting_scope is surfaced in CLI output
try {
  const countingScopeRules = path.join(__dirname, "fixtures", "test-venue-with-counting-scope.json");
  const cmd = `node ${cliPath} --rules ${countingScopeRules} --channel phone --disclosed true`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (output.includes("rate_limit_counting_scope") && output.includes("per_user") && output.includes("per_agent")) {
    console.log(
      "PASS: counting_scope is surfaced in CLI output (per_user explicit, per_agent default)"
    );
  } else {
    console.error(
      "FAIL: Expected counting_scope to appear in CLI output"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on counting_scope test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 19: per-action channel override is displayed in CLI output
try {
  const channelOverrideRules = path.join(__dirname, "fixtures", "test-venue-with-channel-overrides.json");
  const cmd = `node ${cliPath} --rules ${channelOverrideRules} --channel web --disclosed true --action create_booking`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (output.includes("allowed_channels_by_action") && output.includes("create_booking")) {
    console.log(
      "PASS: per-action channel override is displayed in CLI output"
    );
  } else {
    console.error(
      "FAIL: Expected allowed_channels_by_action to appear in CLI output"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on per-action channel override display test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 20: channel check uses per-action override when present (phone denied for create_booking)
try {
  const channelOverrideRules = path.join(__dirname, "fixtures", "test-venue-with-channel-overrides.json");
  const cmd = `node ${cliPath} --rules ${channelOverrideRules} --channel phone --disclosed true --action create_booking`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (output.includes("DENY") && output.includes("allowed_channels_by_action.create_booking")) {
    console.log(
      "PASS: channel check uses per-action override (phone denied for create_booking)"
    );
  } else {
    console.error(
      "FAIL: Expected DENY with per-action override reason for phone on create_booking"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on per-action channel override check test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 21: booking_window info is displayed in CLI output when venue has booking_window
try {
  const bookingWindowRules = path.join(__dirname, "fixtures", "test-venue-with-booking-window.json");
  const cmd = `node ${cliPath} --rules ${bookingWindowRules} --channel phone --disclosed true`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (output.includes("booking_window") && output.includes("min_hours_ahead") && output.includes("max_days_ahead")) {
    console.log(
      "PASS: booking_window info is displayed in CLI output"
    );
  } else {
    console.error(
      "FAIL: Expected booking_window info in CLI output"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on booking_window display test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 22: --target-time evaluates booking window (too far out triggers denial)
try {
  const bookingWindowRules = path.join(__dirname, "fixtures", "test-venue-with-booking-window.json");
  const cmd = `node ${cliPath} --rules ${bookingWindowRules} --channel phone --disclosed true --action create_booking --target-time 2027-06-01T12:00:00Z`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (output.includes("DENY") && output.includes("booking_window.max_days_ahead")) {
    console.log(
      "PASS: --target-time evaluates booking window (too far out triggers denial)"
    );
  } else {
    console.error(
      "FAIL: Expected DENY with booking_window.max_days_ahead reason for far-out booking"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on booking_window evaluation test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 23: absent acknowledgment reference shows informational skip note
try {
  const ackSkipRules = path.join(__dirname, "fixtures", "test-venue-with-ack-skip.json");
  const cmd = `node ${cliPath} --rules ${ackSkipRules} --channel phone --disclosed true`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (output.includes("user_acknowledgment_skipped") && output.includes("deposit_policy") && output.includes("cancellation_policy")) {
    console.log(
      "PASS: absent acknowledgment reference shows informational skip note"
    );
  } else {
    console.error(
      "FAIL: Expected user_acknowledgment_skipped note for absent deposit_policy"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on acknowledgment skip test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 24: timezone absent + booking window present → informational only, no denial
try {
  const noTzWindowRules = path.join(__dirname, "fixtures", "test-venue-with-booking-window-no-tz.json");
  const cmd = `node ${cliPath} --rules ${noTzWindowRules} --channel phone --disclosed true --action create_booking --target-time 2026-03-10T12:30:00Z`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (output.includes("ALLOW") || !output.includes("booking_window.min_hours_ahead")) {
    console.log(
      "PASS: timezone absent + booking window → no denial (informational only)"
    );
  } else {
    console.error(
      "FAIL: Expected no booking window denial when venue_timezone is absent"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on timezone-absent booking window test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 25: absent booking window + deny_if_unspecified → no denial (carve-out)
try {
  const noWindowRules = path.join(__dirname, "fixtures", "test-venue-rules.json");
  const cmd = `node ${cliPath} --rules ${noWindowRules} --channel phone --disclosed true --action create_booking --target-time 2026-06-01T12:00:00Z`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (!output.includes("booking_window")) {
    console.log(
      "PASS: absent booking window + deny_if_unspecified → no booking window denial (carve-out)"
    );
  } else {
    console.error(
      "FAIL: Expected no booking_window mention when field is absent"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on absent booking window carve-out test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 26: contradictory booking window → no denial, warning output
try {
  const contradictoryRules = path.join(__dirname, "fixtures", "test-venue-with-contradictory-window.json");
  const cmd = `node ${cliPath} --rules ${contradictoryRules} --channel phone --disclosed true --action create_booking --target-time 2026-03-15T18:00:00-05:00`;
  const output = execSync(cmd, { encoding: "utf8" });
  if (output.includes("Contradictory") && !output.includes("booking_window.min_hours_ahead") && !output.includes("booking_window.max_days_ahead")) {
    console.log(
      "PASS: contradictory booking window → no booking window denial, warning output"
    );
  } else {
    console.error(
      "FAIL: Expected Contradictory warning and no booking window denial for contradictory window"
    );
    console.error(output);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: CLI threw an error on contradictory booking window test");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// Test 27: invalid --party-size exits with code 2
try {
  const { spawnSync } = require("child_process");
  const result27 = spawnSync("node", [cliPath, "--rules", exampleRules, "--channel", "phone", "--disclosed", "true", "--party-size", "abc"], { encoding: "utf8" });
  if (result27.status === 2 && result27.stderr.includes("Invalid --party-size")) {
    console.log("PASS: invalid --party-size exits with code 2");
  } else {
    console.error("FAIL: Expected exit code 2 for invalid --party-size");
    console.error("status:", result27.status, "stderr:", result27.stderr);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: Error testing invalid --party-size");
  console.error(err.message);
  process.exit(1);
}

// Test 28: invalid --attempt-count exits with code 2
try {
  const { spawnSync } = require("child_process");
  const result28 = spawnSync("node", [cliPath, "--rules", exampleRules, "--channel", "phone", "--disclosed", "true", "--action", "booking_request", "--attempt-count", "xyz"], { encoding: "utf8" });
  if (result28.status === 2 && result28.stderr.includes("Invalid --attempt-count")) {
    console.log("PASS: invalid --attempt-count exits with code 2");
  } else {
    console.error("FAIL: Expected exit code 2 for invalid --attempt-count");
    console.error("status:", result28.status, "stderr:", result28.stderr);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: Error testing invalid --attempt-count");
  console.error(err.message);
  process.exit(1);
}

// Test 29: invalid --target-time exits with code 2
try {
  const { spawnSync } = require("child_process");
  const result29 = spawnSync("node", [cliPath, "--rules", exampleRules, "--channel", "phone", "--disclosed", "true", "--action", "create_booking", "--target-time", "not-a-date"], { encoding: "utf8" });
  if (result29.status === 2 && result29.stderr.includes("Invalid --target-time")) {
    console.log("PASS: invalid --target-time exits with code 2");
  } else {
    console.error("FAIL: Expected exit code 2 for invalid --target-time");
    console.error("status:", result29.status, "stderr:", result29.stderr);
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL: Error testing invalid --target-time");
  console.error(err.message);
  process.exit(1);
}

console.log("\nAll compliance checker tests passed.");
