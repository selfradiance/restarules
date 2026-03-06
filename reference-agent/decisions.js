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
    if (rules.human_escalation_required) {
      const autoMax = rules.human_escalation_required.party_size_auto_max;
      result.partySize = {
        result: partySize > autoMax ? "ESCALATE_TO_HUMAN" : "ALLOWED",
        autoMax,
        conditions: rules.human_escalation_required.conditions,
      };
    } else {
      result.partySize = {
        result: dp === "allow_if_unspecified" ? "ALLOWED" : "DENIED_DEFAULT_POLICY",
        autoMax: null,
        conditions: [],
      };
    }
  } else {
    result.partySize = {
      result: "NOT_CHECKED",
      autoMax: rules.human_escalation_required ? rules.human_escalation_required.party_size_auto_max : null,
      conditions: rules.human_escalation_required ? rules.human_escalation_required.conditions : [],
    };
  }

  // 4. Rate limits
  if (action !== null && attempts !== null) {
    if (rules.rate_limits) {
      const match = rules.rate_limits.find((r) => r.action === action);
      if (match) {
        result.rateLimit = {
          result: attempts >= match.limit ? "EXCEEDED" : "WITHIN_LIMITS",
          limit: match.limit,
          windowValue: match.window_value,
          windowUnit: match.window_unit,
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

  return result;
}

module.exports = { evaluateCompliance };
