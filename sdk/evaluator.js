/**
 * RestaRules compliance decision engine.
 *
 * evaluateCompliance(rules, params) — takes a validated rules object and
 * optional action parameters, returns a structured result object.
 * No I/O, no side effects — pure function.
 */

function evaluateCompliance(rules, { channel = null, partySize = null, action = null, attempts = null } = {}) {
  const dp = rules.default_policy;
  const result = {};

  // 1. Disclosure
  result.disclosure = {
    required: rules.disclosure_required.enabled,
    phrasing: rules.disclosure_required.phrasing || null,
  };

  // 2. Channel check
  if (channel !== null) {
    if (rules.allowed_channels.includes(channel)) {
      result.channel = { result: "ALLOWED" };
    } else {
      result.channel = { result: "DENIED", allowedChannels: rules.allowed_channels };
    }
  } else {
    result.channel = { result: "NOT_CHECKED", allowedChannels: rules.allowed_channels };
  }

  // 3. Party size
  if (partySize !== null) {
    if (rules.party_size_policy) {
      const autoMax = rules.party_size_policy.auto_book_max;
      result.partySize = {
        result: partySize > autoMax ? "ESCALATE_TO_HUMAN" : "ALLOWED",
        autoMax,
      };
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

  // 3b. Escalation conditions (non-party-size triggers)
  result.escalationConditions = rules.human_escalation_required
    ? rules.human_escalation_required.conditions
    : [];

  // 4. Rate limits (with applies_to metadata support)
  if (action !== null && attempts !== null) {
    if (rules.rate_limits) {
      const match = rules.rate_limits.find((r) => r.action === action);
      if (match) {
        result.rateLimit = {
          result: attempts >= match.limit ? "EXCEEDED" : "WITHIN_LIMITS",
          limit: match.limit,
          windowValue: match.window_value,
          windowUnit: match.window_unit,
          appliesTo: match.applies_to || null,
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

  // 5. Third-party restrictions
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

  // 6. Complaint endpoint
  result.complaintEndpoint = rules.complaint_endpoint || null;

  // 7. Venue metadata (informational — never blocks actions)
  result.venueMetadata = {
    currency: rules.venue_currency || null,
    timezone: rules.venue_timezone || null,
  };

  // 8. Deposit policy (permission field — governed by default_policy)
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

  // 9. User acknowledgment requirements (permission field — governed by default_policy)
  if (rules.user_acknowledgment_requirements) {
    result.userAcknowledgmentRequirements = {
      defined: true,
      policies: rules.user_acknowledgment_requirements,
    };
  } else {
    result.userAcknowledgmentRequirements = {
      defined: false,
      defaultPolicyResult: dp === "allow_if_unspecified" ? "ALLOWED" : "DENIED_DEFAULT_POLICY",
    };
  }

  // 10. Cancellation policy (informational — never blocks actions)
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

  // 11. No-show policy (informational — never blocks actions)
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

  return result;
}

module.exports = { evaluateCompliance };
