/**
 * RestaRules compliance decision engine.
 *
 * evaluateCompliance(rules, params) — takes a validated rules object and
 * optional action parameters, returns a structured result object.
 * No I/O, no side effects — pure function.
 */

/**
 * Validate that a timezone string is a recognized IANA timezone.
 * Uses Intl.DateTimeFormat which is available in Node.js 13+ and all modern browsers.
 */
function isValidTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check whether an ISO 8601 datetime string includes a timezone offset (Z, +HH:MM, -HH:MM, etc.).
 * Returns false for naive datetimes like "2026-04-01T18:00:00".
 */
function hasTimezoneOffset(isoString) {
  return /(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(isoString);
}

/**
 * Get the current time expressed in the venue's timezone.
 * Returns a Date object representing "now" as read from the venue's wall clock.
 * Uses Intl.DateTimeFormat to convert — no external dependencies needed.
 */
function getNowInVenueTimezone(venueTimezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: venueTimezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const get = (type) => parts.find(p => p.type === type).value;
  return new Date(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`);
}

function evaluateCompliance(rules, { channel = null, partySize = null, action = null, attempts = null, targetTime = null, currentTime = null } = {}) {
  const dp = rules.default_policy;
  const result = {};

  // Input validation: reject non-finite numeric inputs and invalid date strings
  if (partySize !== null && !Number.isFinite(partySize)) {
    return { inputError: { result: "INVALID_INPUT", reason: `Invalid partySize: ${partySize}` } };
  }
  if (attempts !== null && !Number.isFinite(attempts)) {
    return { inputError: { result: "INVALID_INPUT", reason: `Invalid attempts: ${attempts}` } };
  }
  if (targetTime !== null && isNaN(new Date(targetTime).getTime())) {
    return { inputError: { result: "INVALID_INPUT", reason: `Invalid targetTime: ${targetTime}` } };
  }
  if (currentTime !== null && isNaN(new Date(currentTime).getTime())) {
    return { inputError: { result: "INVALID_INPUT", reason: `Invalid currentTime: ${currentTime}` } };
  }

  // 2. Disclosure
  result.disclosure = {
    required: rules.disclosure_required.enabled,
    phrasing: rules.disclosure_required.phrasing || null,
  };

  // 3. Channel check (with per-action override support)
  if (channel !== null) {
    // Determine effective channel list: per-action override takes precedence
    let effectiveChannels = rules.allowed_channels;
    let channelSource = "base";
    if (action !== null && rules.allowed_channels_by_action && action in rules.allowed_channels_by_action) {
      effectiveChannels = rules.allowed_channels_by_action[action];
      channelSource = "per_action_override";
    }
    if (effectiveChannels.includes(channel)) {
      result.channel = { result: "ALLOWED", source: channelSource, allowedChannels: effectiveChannels };
    } else {
      result.channel = { result: "DENIED", source: channelSource, allowedChannels: effectiveChannels };
    }
  } else {
    result.channel = { result: "NOT_CHECKED", allowedChannels: rules.allowed_channels };
  }

  // 4. Rate limits (with applies_to metadata support)
  if (action !== null && attempts !== null) {
    if (rules.rate_limits) {
      const match = rules.rate_limits.find((r) => {
        if (r.applies_to && Array.isArray(r.applies_to)) {
          return r.applies_to.includes(action);
        }
        return r.action === action;
      });
      if (match) {
        result.rateLimit = {
          result: attempts >= match.limit ? "EXCEEDED" : "WITHIN_LIMITS",
          limit: match.limit,
          windowValue: match.window_value,
          windowUnit: match.window_unit,
          appliesTo: match.applies_to || null,
          matchedVia: (match.applies_to && Array.isArray(match.applies_to)) ? "applies_to" : "action",
          countingScope: match.counting_scope || "per_agent",
        };
      } else {
        result.rateLimit = {
          result: dp === "allow_if_unspecified" ? "WITHIN_LIMITS_DEFAULT_POLICY" : "DENIED_DEFAULT_POLICY",
        };
      }
    } else {
      result.rateLimit = {
        result: dp === "allow_if_unspecified" ? "WITHIN_LIMITS_DEFAULT_POLICY" : "DENIED_DEFAULT_POLICY",
      };
    }
  } else {
    result.rateLimit = { result: "NOT_CHECKED" };
  }

  // 5. Escalation conditions (non-party-size triggers)
  result.escalationConditions = rules.human_escalation_required
    ? rules.human_escalation_required.conditions
    : [];

  // 6. Party size
  if (partySize !== null) {
    if (rules.party_size_policy) {
      const psp = rules.party_size_policy;
      const autoMax = psp.auto_book_max;
      const partySizeResult = {
        result: partySize > autoMax ? "ESCALATE_TO_HUMAN" : "ALLOWED",
        autoMax,
      };

      // Advisory: human_review_above
      if (psp.human_review_above !== undefined) {
        partySizeResult.humanReviewAbove = psp.human_review_above;
        if (partySize > psp.human_review_above) {
          partySizeResult.humanReviewRecommended = true;
        }
      }

      // Advisory: large_party_channels (surfaced when party exceeds auto_book_max)
      if (psp.large_party_channels && partySize > autoMax) {
        partySizeResult.largePartyChannels = psp.large_party_channels;
        // Channel warning if caller provided a channel not in the large party list
        if (channel !== null && !psp.large_party_channels.includes(channel)) {
          partySizeResult.channelWarning = {
            message: "Current channel not in venue's large_party_channels list",
            currentChannel: channel,
            requiredChannels: psp.large_party_channels,
          };
        }
      }

      result.partySize = partySizeResult;
    } else {
      result.partySize = {
        result: dp === "allow_if_unspecified" ? "ALLOWED" : "DENIED_DEFAULT_POLICY",
        autoMax: null,
      };
    }
  } else {
    result.partySize = {
      result: "NOT_CHECKED",
      autoMax: rules.party_size_policy ? rules.party_size_policy.auto_book_max : null,
    };
  }

  // 7. Deposit policy (permission field — governed by default_policy)
  if (rules.deposit_policy) {
    result.depositPolicy = {
      defined: true,
      required: rules.deposit_policy.required,
      amount: rules.deposit_policy.amount || null,
      currency: rules.deposit_policy.currency || null,
      refundable: rules.deposit_policy.refundable !== undefined ? rules.deposit_policy.refundable : null,
    };
  } else {
    result.depositPolicy = {
      defined: false,
      defaultPolicyResult: dp === "allow_if_unspecified" ? "ALLOWED" : "DENIED_DEFAULT_POLICY",
    };
  }

  // 8. User acknowledgment requirements (permission field — governed by default_policy)
  if (rules.user_acknowledgment_requirements) {
    const policyFieldMap = {
      deposit_policy: "deposit_policy",
      cancellation_policy: "cancellation_policy",
      no_show_policy: "no_show_policy",
    };
    const activePolicies = [];
    const skippedPolicies = [];
    for (const policyName of rules.user_acknowledgment_requirements) {
      const fieldKey = policyFieldMap[policyName] || policyName;
      if (rules[fieldKey] !== undefined) {
        activePolicies.push(policyName);
      } else {
        skippedPolicies.push(policyName);
      }
    }
    result.userAcknowledgmentRequirements = {
      defined: true,
      policies: activePolicies,
      skippedPolicies: skippedPolicies.length > 0 ? skippedPolicies : null,
    };
  } else {
    result.userAcknowledgmentRequirements = {
      defined: false,
      defaultPolicyResult: dp === "allow_if_unspecified" ? "ALLOWED" : "DENIED_DEFAULT_POLICY",
    };
  }

  // 9. Third-party restrictions
  if (rules.third_party_restrictions) {
    const tpr = rules.third_party_restrictions;
    result.thirdParty = {
      defined: true,
      noResale: tpr.no_resale,
      noTransfer: tpr.no_transfer,
      identityBound: tpr.identity_bound_booking,
    };
  } else {
    result.thirdParty = {
      defined: false,
      defaultPolicyResult: dp === "allow_if_unspecified" ? "ALLOWED" : "DENIED_DEFAULT_POLICY",
    };
  }

  // 10. Informational fields (never block actions)

  // 10a. Complaint endpoint
  result.complaintEndpoint = rules.complaint_endpoint || null;

  // 10b. Venue metadata
  result.venueMetadata = {
    currency: rules.venue_currency || null,
    timezone: rules.venue_timezone || null,
  };

  // 10c. Cancellation policy (informational — never blocks actions)
  if (rules.cancellation_policy) {
    result.cancellationPolicy = {
      defined: true,
      penaltyApplies: rules.cancellation_policy.penalty_applies,
      windowMinutes: rules.cancellation_policy.window_minutes || null,
      penaltyAmount: rules.cancellation_policy.penalty_amount || null,
      currency: rules.cancellation_policy.currency || null,
    };
  } else {
    result.cancellationPolicy = { defined: false };
  }

  // 10d. No-show policy (informational — never blocks actions)
  if (rules.no_show_policy) {
    result.noShowPolicy = {
      defined: true,
      fee: rules.no_show_policy.fee,
      currency: rules.no_show_policy.currency || null,
      gracePeriodMinutes: rules.no_show_policy.grace_period_minutes || null,
    };
  } else {
    result.noShowPolicy = { defined: false };
  }

  // 11. Booking window (applies to create_booking only; absence never blocks)
  if (rules.booking_window) {
    const bw = rules.booking_window;
    const hasTz = !!rules.venue_timezone;
    const validTz = hasTz && isValidTimezone(rules.venue_timezone);

    // Check for contradictory window (min_hours_ahead >= max_days_ahead * 24)
    const isContradictory = bw.min_hours_ahead !== undefined && bw.max_days_ahead !== undefined &&
      bw.min_hours_ahead >= bw.max_days_ahead * 24;

    if (isContradictory) {
      result.bookingWindow = {
        defined: true,
        enforced: false,
        result: "NOT_EVALUATED",
        reason: `Contradictory booking window: min_hours_ahead (${bw.min_hours_ahead}) exceeds max_days_ahead (${bw.max_days_ahead}) converted to hours (${bw.max_days_ahead * 24}). Treating as non-actionable.`,
        minHoursAhead: bw.min_hours_ahead,
        maxDaysAhead: bw.max_days_ahead,
      };
    } else if (!hasTz) {
      // venue_timezone absent — informational only
      result.bookingWindow = {
        defined: true,
        enforced: false,
        result: "NOT_EVALUATED",
        reason: "venue_timezone absent — informational only",
        minHoursAhead: bw.min_hours_ahead !== undefined ? bw.min_hours_ahead : null,
        maxDaysAhead: bw.max_days_ahead !== undefined ? bw.max_days_ahead : null,
      };
    } else if (!validTz) {
      // venue_timezone present but not a valid IANA timezone
      result.bookingWindow = {
        defined: true,
        enforced: false,
        result: "NOT_EVALUATED",
        reason: `invalid_venue_timezone: "${rules.venue_timezone}" is not a recognized IANA timezone`,
        minHoursAhead: bw.min_hours_ahead !== undefined ? bw.min_hours_ahead : null,
        maxDaysAhead: bw.max_days_ahead !== undefined ? bw.max_days_ahead : null,
      };
    } else if (action !== "create_booking" || targetTime === null) {
      // Informational only — either not create_booking or no target_time
      result.bookingWindow = {
        defined: true,
        enforced: false,
        result: "NOT_EVALUATED",
        reason: null,
        minHoursAhead: bw.min_hours_ahead !== undefined ? bw.min_hours_ahead : null,
        maxDaysAhead: bw.max_days_ahead !== undefined ? bw.max_days_ahead : null,
      };
    } else if (!hasTimezoneOffset(targetTime)) {
      // targetTime missing timezone offset — cannot safely compare
      result.bookingWindow = {
        defined: true,
        enforced: false,
        result: "NOT_EVALUATED",
        reason: "target_time_missing_timezone: targetTime must include a timezone offset (Z or +/-HH:MM)",
        minHoursAhead: bw.min_hours_ahead !== undefined ? bw.min_hours_ahead : null,
        maxDaysAhead: bw.max_days_ahead !== undefined ? bw.max_days_ahead : null,
      };
    } else {
      // All preconditions met — evaluate booking window with timezone-correct time math
      const now = currentTime ? new Date(currentTime) : getNowInVenueTimezone(rules.venue_timezone);
      const target = new Date(targetTime);
      const diffMs = target.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      let windowResult = "ALLOWED";
      let reason = null;
      if (bw.min_hours_ahead !== undefined && diffHours < bw.min_hours_ahead) {
        windowResult = "DENIED";
        reason = `Booking is ${diffHours.toFixed(1)} hours ahead, minimum is ${bw.min_hours_ahead}`;
      } else if (bw.max_days_ahead !== undefined && diffDays > bw.max_days_ahead) {
        windowResult = "DENIED";
        reason = `Booking is ${diffDays.toFixed(1)} days ahead, maximum is ${bw.max_days_ahead}`;
      }

      result.bookingWindow = {
        defined: true,
        enforced: true,
        result: windowResult,
        reason,
        minHoursAhead: bw.min_hours_ahead !== undefined ? bw.min_hours_ahead : null,
        maxDaysAhead: bw.max_days_ahead !== undefined ? bw.max_days_ahead : null,
      };
    }
  } else {
    // Absent booking_window — never blocks, regardless of default_policy
    result.bookingWindow = { defined: false };
  }

  return result;
}

/**
 * Compute an aggregate allow/deny verdict from a compliance report.
 * Returns { verdict: "ALLOW"|"DENY"|"INVALID", reasons: string[] }.
 */
function getAggregateVerdict(report) {
  // Invalid input takes precedence
  if (report.inputError) {
    return { verdict: "INVALID", reasons: [report.inputError.reason] };
  }

  const reasons = [];

  // Channel check
  if (report.channel && report.channel.result === "DENIED") {
    reasons.push(`Channel not in allowed_channels [${report.channel.allowedChannels.join(", ")}]`);
  }

  // Rate limit check
  if (report.rateLimit) {
    if (report.rateLimit.result === "EXCEEDED") {
      reasons.push(`Rate limit exceeded: ${report.rateLimit.limit} per ${report.rateLimit.windowValue} ${report.rateLimit.windowUnit}`);
    } else if (report.rateLimit.result === "DENIED_DEFAULT_POLICY") {
      reasons.push("Rate limit denied by default policy");
    }
  }

  // Party size check
  if (report.partySize) {
    if (report.partySize.result === "ESCALATE_TO_HUMAN") {
      reasons.push(`Party size exceeds auto_book_max of ${report.partySize.autoMax} — escalation required`);
    } else if (report.partySize.result === "DENIED_DEFAULT_POLICY") {
      reasons.push("Party size denied by default policy");
    }
  }

  // Third-party restrictions
  if (report.thirdParty && !report.thirdParty.defined && report.thirdParty.defaultPolicyResult === "DENIED_DEFAULT_POLICY") {
    reasons.push("Third-party restrictions denied by default policy");
  }

  // Deposit policy
  if (report.depositPolicy && !report.depositPolicy.defined && report.depositPolicy.defaultPolicyResult === "DENIED_DEFAULT_POLICY") {
    reasons.push("Deposit policy denied by default policy");
  }

  // User acknowledgment requirements
  if (report.userAcknowledgmentRequirements && !report.userAcknowledgmentRequirements.defined &&
      report.userAcknowledgmentRequirements.defaultPolicyResult === "DENIED_DEFAULT_POLICY") {
    reasons.push("User acknowledgment requirements denied by default policy");
  }

  // Booking window
  if (report.bookingWindow && report.bookingWindow.result === "DENIED") {
    reasons.push(report.bookingWindow.reason || "Booking window constraint violated");
  }

  if (reasons.length > 0) {
    return { verdict: "DENY", reasons };
  }

  return { verdict: "ALLOW", reasons: [] };
}

module.exports = { evaluateCompliance, getAggregateVerdict };
