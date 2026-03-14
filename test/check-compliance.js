const { execSync, spawnSync } = require("child_process");
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

// Run CLI and return { stdout, stderr, status } without throwing on non-zero exit
function runSafe(argArray, rulesFile) {
  const r = rulesFile || exampleRules;
  return spawnSync("node", [cliPath, "--rules", r, ...argArray], { encoding: "utf8" });
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
{
  const r = runSafe(["--channel", "phone", "--disclosed", "false"]);
  if (r.status === 1 && r.stdout.includes("DENY") && r.stdout.includes("disclosure_required")) {
    console.log("PASS: Undisclosed agent gets DENY with disclosure reason");
  } else {
    console.error("FAIL: Expected DENY (exit 1) with disclosure reason for undisclosed agent");
    console.error("status:", r.status, "stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 3: DENY — disclosed agent on a disallowed channel
{
  const r = runSafe(["--channel", "sms", "--disclosed", "true"]);
  if (r.status === 1 && r.stdout.includes("DENY") && r.stdout.includes("allowed_channels")) {
    console.log("PASS: Agent on disallowed channel gets DENY with channel reason");
  } else {
    console.error("FAIL: Expected DENY (exit 1) with channel reason for disallowed channel");
    console.error("status:", r.status, "stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 4: ALLOW — rate limit not exceeded (2 attempts, limit is 3; uses applies_to match)
try {
  const output = run("--channel web --disclosed true --action create_booking --attempt-count 2");
  if (output.includes("ALLOW")) {
    console.log(
      "PASS: Agent within rate limit gets ALLOW (create_booking matches applies_to)"
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

// Test 5: DENY — rate limit exceeded (3 attempts, limit is 3; uses applies_to match)
{
  const r = runSafe(["--channel", "web", "--disclosed", "true", "--action", "create_booking", "--attempt-count", "3"]);
  if (r.status === 1 && r.stdout.includes("DENY") && r.stdout.includes("Rate limit exceeded")) {
    console.log("PASS: Agent exceeding rate limit gets DENY with rate limit reason (via applies_to)");
  } else {
    console.error("FAIL: Expected DENY (exit 1) with rate limit reason for exceeded attempt count");
    console.error("status:", r.status, "stdout:", r.stdout);
    process.exit(1);
  }
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
{
  const r = runSafe(["--channel", "phone", "--disclosed", "true", "--party-size", "8"]);
  if (r.status === 1 && r.stdout.includes("DENY") && r.stdout.includes("auto_book_max")) {
    console.log("PASS: Party size exceeding auto-max gets DENY with escalation reason");
  } else {
    console.error("FAIL: Expected DENY (exit 1) with escalation reason for oversized party");
    console.error("status:", r.status, "stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 8: DENY — escalation condition triggered
{
  const r = runSafe(["--channel", "phone", "--disclosed", "true", "--escalation-condition", "special_event_booking"]);
  if (r.status === 1 && r.stdout.includes("DENY") && r.stdout.includes("human handoff")) {
    console.log("PASS: Triggered escalation condition gets DENY with handoff reason");
  } else {
    console.error("FAIL: Expected DENY (exit 1) with handoff reason for escalation condition");
    console.error("status:", r.status, "stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 9: DENY — agent acting as third party (all restrictions enabled in example)
{
  const r = runSafe(["--channel", "phone", "--disclosed", "true", "--third-party", "true"]);
  if (r.status === 1 && r.stdout.includes("DENY") && r.stdout.includes("Third-party action denied")) {
    console.log("PASS: Third-party agent gets DENY with restriction reason");
  } else {
    console.error("FAIL: Expected DENY (exit 1) with restriction reason for third-party agent");
    console.error("status:", r.status, "stdout:", r.stdout);
    process.exit(1);
  }
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
{
  const noDepositRules = path.join(__dirname, "fixtures", "test-venue-with-no-show.json");
  const r = runSafe(["--channel", "phone", "--disclosed", "true"], noDepositRules);
  if (r.status === 1 && r.stdout.includes("DENY") && r.stdout.includes("deposit_policy is absent")) {
    console.log("PASS: Missing deposit_policy with deny_if_unspecified produces DENY");
  } else {
    console.error("FAIL: Expected DENY (exit 1) with deposit_policy absence reason");
    console.error("status:", r.status, "stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 18: counting_scope is surfaced in CLI output
{
  const countingScopeRules = path.join(__dirname, "fixtures", "test-venue-with-counting-scope.json");
  const r = runSafe(["--channel", "phone", "--disclosed", "true"], countingScopeRules);
  if (r.stdout.includes("rate_limit_counting_scope") && r.stdout.includes("per_user") && r.stdout.includes("per_agent")) {
    console.log("PASS: counting_scope is surfaced in CLI output (per_user explicit, per_agent default)");
  } else {
    console.error("FAIL: Expected counting_scope to appear in CLI output");
    console.error("stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 19: per-action channel override is displayed in CLI output
{
  const channelOverrideRules = path.join(__dirname, "fixtures", "test-venue-with-channel-overrides.json");
  const r = runSafe(["--channel", "web", "--disclosed", "true", "--action", "create_booking"], channelOverrideRules);
  if (r.stdout.includes("allowed_channels_by_action") && r.stdout.includes("create_booking")) {
    console.log("PASS: per-action channel override is displayed in CLI output");
  } else {
    console.error("FAIL: Expected allowed_channels_by_action to appear in CLI output");
    console.error("stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 20: channel check uses per-action override when present (phone denied for create_booking)
{
  const channelOverrideRules = path.join(__dirname, "fixtures", "test-venue-with-channel-overrides.json");
  const r = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "create_booking"], channelOverrideRules);
  if (r.status === 1 && r.stdout.includes("DENY") && r.stdout.includes("allowed_channels_by_action.create_booking")) {
    console.log("PASS: channel check uses per-action override (phone denied for create_booking)");
  } else {
    console.error("FAIL: Expected DENY (exit 1) with per-action override reason for phone on create_booking");
    console.error("status:", r.status, "stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 21: booking_window info is displayed in CLI output when venue has booking_window
{
  const bookingWindowRules = path.join(__dirname, "fixtures", "test-venue-with-booking-window.json");
  const r = runSafe(["--channel", "phone", "--disclosed", "true"], bookingWindowRules);
  if (r.stdout.includes("booking_window") && r.stdout.includes("min_hours_ahead") && r.stdout.includes("max_days_ahead")) {
    console.log("PASS: booking_window info is displayed in CLI output");
  } else {
    console.error("FAIL: Expected booking_window info in CLI output");
    console.error("stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 22: --target-time evaluates booking window (too far out triggers denial)
{
  const bookingWindowRules = path.join(__dirname, "fixtures", "test-venue-with-booking-window.json");
  const r = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "create_booking", "--target-time", "2027-06-01T12:00:00Z"], bookingWindowRules);
  if (r.status === 1 && r.stdout.includes("DENY") && r.stdout.includes("booking_window.max_days_ahead")) {
    console.log("PASS: --target-time evaluates booking window (too far out triggers denial)");
  } else {
    console.error("FAIL: Expected DENY (exit 1) with booking_window.max_days_ahead reason for far-out booking");
    console.error("status:", r.status, "stdout:", r.stdout);
    process.exit(1);
  }
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

// Test 24: timezone absent + booking window present → informational only, no booking window denial
{
  const noTzWindowRules = path.join(__dirname, "fixtures", "test-venue-with-booking-window-no-tz.json");
  const r = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "create_booking", "--target-time", "2026-03-10T12:30:00Z"], noTzWindowRules);
  // May DENY for other reasons (deny_if_unspecified + absent fields), but booking_window should not produce a denial
  if (!r.stdout.includes("booking_window.min_hours_ahead")) {
    console.log("PASS: timezone absent + booking window → no denial (informational only)");
  } else {
    console.error("FAIL: Expected no booking window denial when venue_timezone is absent");
    console.error("stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 25: absent booking window + deny_if_unspecified → no booking window denial (carve-out)
{
  const noWindowRules = path.join(__dirname, "fixtures", "test-venue-rules.json");
  const r = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "create_booking", "--target-time", "2026-06-01T12:00:00Z"], noWindowRules);
  // This venue has deny_if_unspecified so it may DENY for other reasons (rate_limits absent), but
  // the key assertion is that booking_window absence does NOT produce a booking_window denial.
  if (!r.stdout.includes("booking_window")) {
    console.log("PASS: absent booking window + deny_if_unspecified → no booking window denial (carve-out)");
  } else {
    console.error("FAIL: Expected no booking_window mention when field is absent");
    console.error("stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 26: contradictory booking window → no booking window denial, warning output
{
  const contradictoryRules = path.join(__dirname, "fixtures", "test-venue-with-contradictory-window.json");
  const r = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "create_booking", "--target-time", "2026-03-15T18:00:00-05:00"], contradictoryRules);
  // May DENY for other reasons (deny_if_unspecified + absent fields), but booking_window should not produce a denial
  if (r.stdout.includes("Contradictory") && !r.stdout.includes("booking_window.min_hours_ahead") && !r.stdout.includes("booking_window.max_days_ahead")) {
    console.log("PASS: contradictory booking window → no booking window denial, warning output");
  } else {
    console.error("FAIL: Expected Contradictory warning and no booking window denial for contradictory window");
    console.error("stdout:", r.stdout);
    process.exit(1);
  }
}

// Test 27: invalid --party-size exits with code 2
{
  const r27 = runSafe(["--channel", "phone", "--disclosed", "true", "--party-size", "abc"]);
  if (r27.status === 2 && r27.stderr.includes("Invalid --party-size")) {
    console.log("PASS: invalid --party-size exits with code 2");
  } else {
    console.error("FAIL: Expected exit code 2 for invalid --party-size");
    console.error("status:", r27.status, "stderr:", r27.stderr);
    process.exit(1);
  }
}

// Test 28: invalid --attempt-count exits with code 2
{
  const r28 = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "booking_request", "--attempt-count", "xyz"]);
  if (r28.status === 2 && r28.stderr.includes("Invalid --attempt-count")) {
    console.log("PASS: invalid --attempt-count exits with code 2");
  } else {
    console.error("FAIL: Expected exit code 2 for invalid --attempt-count");
    console.error("status:", r28.status, "stderr:", r28.stderr);
    process.exit(1);
  }
}

// Test 29: invalid --target-time exits with code 2
{
  const r29 = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "create_booking", "--target-time", "not-a-date"]);
  if (r29.status === 2 && r29.stderr.includes("Invalid --target-time")) {
    console.log("PASS: invalid --target-time exits with code 2");
  } else {
    console.error("FAIL: Expected exit code 2 for invalid --target-time");
    console.error("status:", r29.status, "stderr:", r29.stderr);
    process.exit(1);
  }
}

// Test 30: ALLOW produces exit code 0
{
  const r30 = runSafe(["--channel", "phone", "--disclosed", "true"]);
  if (r30.status === 0 && r30.stdout.includes("ALLOW")) {
    console.log("PASS: ALLOW produces exit code 0");
  } else {
    console.error("FAIL: Expected exit code 0 for ALLOW");
    console.error("status:", r30.status, "stdout:", r30.stdout);
    process.exit(1);
  }
}

// Test 31: DENY produces exit code 1
{
  const r31 = runSafe(["--channel", "sms", "--disclosed", "true"]);
  if (r31.status === 1 && r31.stdout.includes("DENY")) {
    console.log("PASS: DENY produces exit code 1");
  } else {
    console.error("FAIL: Expected exit code 1 for DENY");
    console.error("status:", r31.status, "stdout:", r31.stdout);
    process.exit(1);
  }
}

// Test 32: schema validation failure produces exit code 2
{
  const badFixture = path.join(__dirname, "fixtures", "test-venue-rules.json");
  // Create an invalid rules input by passing a path to package.json (not a valid rules file)
  const pkgJson = path.join(__dirname, "..", "package.json");
  const r32 = spawnSync("node", [cliPath, "--rules", pkgJson, "--channel", "phone", "--disclosed", "true"], { encoding: "utf8" });
  if (r32.status === 2 && r32.stdout.includes("DENY") && r32.stdout.includes("schema validation")) {
    console.log("PASS: schema validation failure produces exit code 2");
  } else {
    console.error("FAIL: Expected exit code 2 for schema validation failure");
    console.error("status:", r32.status, "stdout:", r32.stdout);
    process.exit(1);
  }
}

// Test 33: applies_to match — create_booking matches rate limit via applies_to
{
  const appliesToRules = path.join(__dirname, "fixtures", "test-venue-with-applies-to-match.json");
  const r33 = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "create_booking", "--attempt-count", "6"], appliesToRules);
  if (r33.status === 1 && r33.stdout.includes("DENY") && r33.stdout.includes("Rate limit exceeded")) {
    console.log("PASS: applies_to match — create_booking exceeding limit denied via applies_to");
  } else {
    console.error("FAIL: Expected DENY for create_booking exceeding rate limit via applies_to");
    console.error("status:", r33.status, "stdout:", r33.stdout);
    process.exit(1);
  }
}

// Test 34: applies_to mismatch — cancel_booking does not match rate limit with applies_to
{
  const appliesToRules = path.join(__dirname, "fixtures", "test-venue-with-applies-to-match.json");
  const r34 = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "cancel_booking", "--attempt-count", "99"], appliesToRules);
  if (r34.status === 0 && r34.stdout.includes("ALLOW")) {
    console.log("PASS: applies_to mismatch — cancel_booking not matched by applies_to scoped rule");
  } else {
    console.error("FAIL: Expected ALLOW for cancel_booking (not in applies_to)");
    console.error("status:", r34.status, "stdout:", r34.stdout);
    process.exit(1);
  }
}

// Test 35: category label does not match when applies_to is present
{
  const appliesToRules = path.join(__dirname, "fixtures", "test-venue-with-applies-to-match.json");
  const r35 = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "booking_request", "--attempt-count", "99"], appliesToRules);
  if (r35.status === 0 && r35.stdout.includes("ALLOW")) {
    console.log("PASS: category label booking_request does not match when applies_to is present");
  } else {
    console.error("FAIL: Expected ALLOW for booking_request (category label, not in applies_to)");
    console.error("status:", r35.status, "stdout:", r35.stdout);
    process.exit(1);
  }
}

// Test 36: rule without applies_to still matches on action (backward compat)
{
  const appliesToRules = path.join(__dirname, "fixtures", "test-venue-with-applies-to-match.json");
  const r36 = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "inquiry", "--attempt-count", "11"], appliesToRules);
  if (r36.status === 1 && r36.stdout.includes("DENY") && r36.stdout.includes("Rate limit exceeded")) {
    console.log("PASS: rule without applies_to still matches on action field (backward compat)");
  } else {
    console.error("FAIL: Expected DENY for inquiry exceeding rate limit via action field");
    console.error("status:", r36.status, "stdout:", r36.stdout);
    process.exit(1);
  }
}

// Test 37: invalid venue_timezone — booking window not enforced, warning output
{
  const invalidTzRules = path.join(__dirname, "fixtures", "test-venue-with-invalid-timezone.json");
  const r37 = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "create_booking", "--target-time", "2026-04-01T18:00:00Z"], invalidTzRules);
  if (r37.stdout.includes("invalid_venue_timezone") && !r37.stdout.includes("booking_window.min_hours_ahead")) {
    console.log("PASS: invalid venue_timezone — booking window warning, no enforcement");
  } else {
    console.error("FAIL: Expected invalid_venue_timezone warning and no booking window enforcement");
    console.error("stdout:", r37.stdout);
    process.exit(1);
  }
}

// Test 38: targetTime without timezone offset — booking window not enforced, warning output
{
  const bookingWindowRules = path.join(__dirname, "fixtures", "test-venue-with-booking-window.json");
  const r38 = runSafe(["--channel", "phone", "--disclosed", "true", "--action", "create_booking", "--target-time", "2026-04-01T18:00:00"], bookingWindowRules);
  if (r38.stdout.includes("target_time_missing_timezone") && !r38.stdout.includes("booking_window.min_hours_ahead")) {
    console.log("PASS: targetTime without timezone offset — booking window warning, no enforcement");
  } else {
    console.error("FAIL: Expected target_time_missing_timezone warning and no booking window enforcement");
    console.error("stdout:", r38.stdout);
    process.exit(1);
  }
}

console.log("\nAll compliance checker tests passed.");
