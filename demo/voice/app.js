// RestaRules Voice Demo — app.js
// SDK is available as window.RestaRulesSDK (loaded from bundle.js)

(function () {
  "use strict";

  var RULES_URL = "https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json";
  var sdk = window.RestaRulesSDK;
  var rules = null;
  var speaking = false;

  // DOM elements
  var venueNameEl = document.getElementById("venue-name");
  var rulesUrlEl = document.getElementById("rules-url");
  var rulesStatusEl = document.getElementById("rules-status");
  var scenarioBtns = document.querySelectorAll(".scenario-btn");
  var ruleTraceEl = document.getElementById("rule-trace");
  var traceListEl = document.getElementById("trace-list");
  var resultEl = document.getElementById("result");
  var resultVerdictEl = document.getElementById("result-verdict");
  var resultExplanationEl = document.getElementById("result-explanation");
  var triggeredRulesEl = document.getElementById("triggered-rules");
  var triggeredRulesListEl = document.getElementById("triggered-rules-list");
  var speakControlsEl = document.getElementById("speak-controls");
  var speakBtn = document.getElementById("speak-btn");
  var transcriptEl = document.getElementById("transcript");
  var transcriptTextEl = document.getElementById("transcript-text");

  // ============================================================
  // UI helpers
  // ============================================================

  function clearPanels() {
    ruleTraceEl.style.display = "none";
    resultEl.style.display = "none";
    triggeredRulesEl.style.display = "none";
    speakControlsEl.style.display = "none";
    transcriptEl.style.display = "none";
    traceListEl.innerHTML = "";
    triggeredRulesListEl.innerHTML = "";
    // Remove active state from all buttons
    for (var i = 0; i < scenarioBtns.length; i++) {
      scenarioBtns[i].classList.remove("active");
    }
  }

  function setButtonsDisabled(disabled) {
    for (var i = 0; i < scenarioBtns.length; i++) {
      scenarioBtns[i].disabled = disabled;
    }
  }

  function addTraceItem(icon, text) {
    var li = document.createElement("li");
    var iconSpan = document.createElement("span");
    iconSpan.className = "trace-icon";
    iconSpan.textContent = icon;
    var textSpan = document.createElement("span");
    textSpan.textContent = text;
    li.appendChild(iconSpan);
    li.appendChild(textSpan);
    traceListEl.appendChild(li);
  }

  function showResult(verdictClass, verdictText, explanation, speechText) {
    resultEl.style.display = "block";
    resultVerdictEl.className = "result-verdict " + verdictClass;
    resultVerdictEl.textContent = verdictText;
    resultExplanationEl.textContent = explanation;

    // Show transcript
    transcriptEl.style.display = "block";
    transcriptTextEl.textContent = speechText;

    // Show speak button if speech is available
    if ("speechSynthesis" in window) {
      speakControlsEl.style.display = "block";
      speakBtn.disabled = false;
      // Store speech text on button for later use
      speakBtn.setAttribute("data-speech", speechText);
    }
  }

  function addTriggeredRule(text) {
    triggeredRulesEl.style.display = "block";
    var div = document.createElement("div");
    div.className = "rule-item";
    div.textContent = text;
    triggeredRulesListEl.appendChild(div);
  }

  // ============================================================
  // Scenario runner
  // ============================================================

  function runScenario(scenarioNum, btn) {
    if (!rules || speaking) return;
    clearPanels();
    btn.classList.add("active");
    ruleTraceEl.style.display = "block";

    switch (scenarioNum) {
      case 1: runScenario1(); break;
      case 2: runScenario2(); break;
      case 3: runScenario3(); break;
      case 4: runScenario4(); break;
      case 5: runScenario5(); break;
    }
  }

  // Scenario 1: Disclosure check
  function runScenario1() {
    var decision = sdk.evaluateCompliance(rules, {});

    addTraceItem("\u2714", "Checking disclosure_required.enabled...");

    if (decision.disclosure.required) {
      addTraceItem("\u2714", "Disclosure IS required");
      addTraceItem("\u2714", "Required phrasing: \"" + decision.disclosure.phrasing + "\"");
    } else {
      addTraceItem("\u2714", "Disclosure is NOT required");
    }

    var speechText = "Scenario: Disclosure check for " + rules.venue_name + ". ";
    if (decision.disclosure.required) {
      speechText += "This venue requires AI agents to identify themselves before any interaction. " +
        "The required phrasing is: " + decision.disclosure.phrasing + " " +
        "An agent must speak these words before making any request.";
    } else {
      speechText += "This venue does not require AI agents to disclose their identity.";
    }

    var verdict = decision.disclosure.required ? "DISCLOSURE REQUIRED" : "DISCLOSURE NOT REQUIRED";
    var explanation = decision.disclosure.required
      ? "The agent must identify itself as an AI before any interaction, using the venue's required phrasing."
      : "The venue does not require AI disclosure.";

    showResult("info", verdict, explanation, speechText);
    addTriggeredRule("disclosure_required.enabled: " + decision.disclosure.required);
    if (decision.disclosure.phrasing) {
      addTriggeredRule("disclosure_required.phrasing: \"" + decision.disclosure.phrasing + "\"");
    }
  }

  // Scenario 2: Book for 4 by phone
  function runScenario2() {
    var decision = sdk.evaluateCompliance(rules, {
      channel: "phone",
      partySize: 4,
    });

    if (decision.disclosure.required) {
      addTraceItem("\u2714", "Disclosure required — agent must identify as AI");
    } else {
      addTraceItem("\u2714", "Disclosure not required");
    }

    if (decision.channel.result === "ALLOWED") {
      addTraceItem("\u2714", "Channel 'phone' is allowed");
    } else {
      addTraceItem("\u2718", "Channel 'phone' is denied");
    }

    if (decision.partySize.result === "ALLOWED") {
      addTraceItem("\u2714", "Party size 4 is within auto-book limit (max: " + decision.partySize.autoMax + ")");
    } else {
      addTraceItem("\u2718", "Party size 4 requires escalation");
    }

    var speechText = "Scenario: Book a table for 4 by phone at " + rules.venue_name + ". " +
      "First, I must disclose that I am an AI. The required phrasing is: " + (decision.disclosure.phrasing || "I am an AI assistant.") + " " +
      "Checking the channel: phone is allowed. " +
      "Checking party size: a party of 4 is within the auto-book maximum of " + decision.partySize.autoMax + ". " +
      "Result: This booking is ALLOWED. The agent may proceed.";

    showResult("allowed", "ALLOWED", "A party of 4 booking by phone is permitted. The agent must disclose its AI identity before proceeding.", speechText);

    addTriggeredRule("disclosure_required.enabled: true");
    addTriggeredRule("allowed_channels: " + JSON.stringify(rules.allowed_channels) + " \u2192 phone is permitted");
    addTriggeredRule("party_size_policy.auto_book_max: " + decision.partySize.autoMax + " \u2192 party of 4 is within limit");
  }

  // Scenario 3: Book for 12 by phone — escalation
  function runScenario3() {
    var decision = sdk.evaluateCompliance(rules, {
      channel: "phone",
      partySize: 12,
    });

    if (decision.disclosure.required) {
      addTraceItem("\u2714", "Disclosure required — agent must identify as AI");
    }

    if (decision.channel.result === "ALLOWED") {
      addTraceItem("\u2714", "Channel 'phone' is allowed");
    } else {
      addTraceItem("\u2718", "Channel 'phone' is denied");
    }

    addTraceItem("\u2718", "Party size 12 exceeds auto-book limit (max: " + decision.partySize.autoMax + ")");
    addTraceItem("\u26A0", "Must escalate to human staff");

    var speechText = "Scenario: Book a table for 12 by phone at " + rules.venue_name + ". " +
      "First, I must disclose that I am an AI. " +
      "Checking the channel: phone is allowed. " +
      "Checking party size: a party of 12 exceeds the auto-book maximum of " + decision.partySize.autoMax + ". " +
      "Result: ESCALATE TO HUMAN. The agent cannot complete this booking automatically. It must hand off to a human staff member to handle a party of this size.";

    showResult("escalate", "ESCALATE TO HUMAN", "A party of 12 exceeds the auto-book maximum of " + decision.partySize.autoMax + ". The agent must hand off to human staff.", speechText);

    addTriggeredRule("party_size_policy.auto_book_max: " + decision.partySize.autoMax + " \u2192 party of 12 exceeds limit");
    addTriggeredRule("Decision: ESCALATE_TO_HUMAN — agent cannot auto-book");
  }

  // Scenario 4: Deposit required — booking allowed but acknowledgment needed
  function runScenario4() {
    var decision = sdk.evaluateCompliance(rules, {
      channel: "phone",
      partySize: 4,
    });

    addTraceItem("\u2714", "Booking for 4 by phone is allowed (see Scenario 2)");

    // Deposit check
    if (decision.depositPolicy.defined && decision.depositPolicy.required) {
      addTraceItem("\u26A0", "Deposit required: " + decision.depositPolicy.amount + " " + (decision.depositPolicy.currency || ""));
      var refundText = decision.depositPolicy.refundable ? "refundable" : "non-refundable";
      addTraceItem("\u26A0", "Deposit is " + refundText);
    }

    // Acknowledgment check
    if (decision.userAcknowledgmentRequirements.defined) {
      var policies = decision.userAcknowledgmentRequirements.policies;
      addTraceItem("\u26A0", "User must acknowledge " + policies.length + " policies: " + policies.join(", "));
    }

    var depositAmount = decision.depositPolicy.amount || 0;
    var depositCurrency = decision.depositPolicy.currency || "USD";
    var refundable = decision.depositPolicy.refundable ? "refundable" : "non-refundable";
    var ackPolicies = decision.userAcknowledgmentRequirements.defined
      ? decision.userAcknowledgmentRequirements.policies.join(", ")
      : "none";

    var speechText = "Scenario: Deposit and acknowledgment check at " + rules.venue_name + ". " +
      "The booking for 4 by phone is allowed, but before proceeding, the agent must handle deposit and acknowledgment requirements. " +
      "A deposit of " + depositAmount + " " + depositCurrency + " is required. This deposit is " + refundable + ". " +
      "The agent must also confirm that the user acknowledges the following policies: " + ackPolicies + ". " +
      "Result: ALLOWED with conditions. The agent may proceed only after collecting the deposit and obtaining user acknowledgment.";

    showResult("allowed", "ALLOWED (with conditions)", "Booking is permitted, but the agent must collect a " + depositAmount + " " + depositCurrency + " " + refundable + " deposit and get user acknowledgment of venue policies before proceeding.", speechText);

    addTriggeredRule("deposit_policy.required: true");
    addTriggeredRule("deposit_policy.amount: " + depositAmount + " " + depositCurrency);
    addTriggeredRule("deposit_policy.refundable: " + decision.depositPolicy.refundable);
    if (decision.userAcknowledgmentRequirements.defined) {
      addTriggeredRule("user_acknowledgment_requirements: [" + ackPolicies + "]");
    }
  }

  // Scenario 5: Cancellation and no-show terms (informational)
  function runScenario5() {
    var decision = sdk.evaluateCompliance(rules, {
      channel: "phone",
      partySize: 4,
    });

    addTraceItem("\u2714", "Booking for 4 by phone is allowed");
    addTraceItem("\u2139", "Checking informational fields (these never block actions)...");

    // Cancellation policy
    if (decision.cancellationPolicy.defined) {
      if (decision.cancellationPolicy.penaltyApplies) {
        addTraceItem("\u2139", "Cancellation penalty applies: " + decision.cancellationPolicy.penaltyAmount + " " + (decision.cancellationPolicy.currency || "") + " within " + decision.cancellationPolicy.windowMinutes + " minutes");
      } else {
        addTraceItem("\u2139", "No cancellation penalty");
      }
    } else {
      addTraceItem("\u2139", "No cancellation policy defined");
    }

    // No-show policy
    if (decision.noShowPolicy.defined) {
      addTraceItem("\u2139", "No-show fee: " + decision.noShowPolicy.fee + " " + (decision.noShowPolicy.currency || "") + " (grace period: " + (decision.noShowPolicy.gracePeriodMinutes || 0) + " minutes)");
    } else {
      addTraceItem("\u2139", "No no-show policy defined");
    }

    var speechText = "Scenario: Cancellation and no-show terms at " + rules.venue_name + ". " +
      "These are informational fields. They never block a booking, but the agent should convey them to the user. ";

    if (decision.cancellationPolicy.defined && decision.cancellationPolicy.penaltyApplies) {
      speechText += "Cancellation policy: a penalty of " + decision.cancellationPolicy.penaltyAmount + " " + (decision.cancellationPolicy.currency || "") + " applies if cancelled within " + decision.cancellationPolicy.windowMinutes + " minutes of the reservation. ";
    }

    if (decision.noShowPolicy.defined) {
      speechText += "No-show policy: a fee of " + decision.noShowPolicy.fee + " " + (decision.noShowPolicy.currency || "") + " will be charged if the guest does not arrive within " + (decision.noShowPolicy.gracePeriodMinutes || 0) + " minutes of the reservation time. ";
    }

    speechText += "Result: INFORMATIONAL. The agent should share these terms with the user but they do not prevent the booking.";

    showResult("info", "INFORMATIONAL", "The agent should convey cancellation and no-show terms to the user. These fields never block bookings — they are informational only.", speechText);

    if (decision.cancellationPolicy.defined) {
      addTriggeredRule("cancellation_policy.penalty_applies: " + decision.cancellationPolicy.penaltyApplies);
      if (decision.cancellationPolicy.penaltyApplies) {
        addTriggeredRule("cancellation_policy.penalty_amount: " + decision.cancellationPolicy.penaltyAmount + " " + (decision.cancellationPolicy.currency || ""));
        addTriggeredRule("cancellation_policy.window_minutes: " + decision.cancellationPolicy.windowMinutes);
      }
    }
    if (decision.noShowPolicy.defined) {
      addTriggeredRule("no_show_policy.fee: " + decision.noShowPolicy.fee + " " + (decision.noShowPolicy.currency || ""));
      addTriggeredRule("no_show_policy.grace_period_minutes: " + (decision.noShowPolicy.gracePeriodMinutes || 0));
    }
  }

  // ============================================================
  // Speech synthesis
  // ============================================================

  var speechReady = false;

  function initSpeech() {
    if (!("speechSynthesis" in window)) {
      console.log("Speech synthesis not available in this browser");
      return;
    }

    // Voices may load asynchronously
    var voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      speechReady = true;
      console.log("Speech ready — " + voices.length + " voices available");
    }

    speechSynthesis.addEventListener("voiceschanged", function () {
      voices = speechSynthesis.getVoices();
      speechReady = true;
      console.log("Voices loaded — " + voices.length + " voices available");
    });
  }

  function speakText(text) {
    if (!speechReady || speaking) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;

    speaking = true;
    setButtonsDisabled(true);
    speakBtn.disabled = true;
    speakBtn.textContent = "Speaking...";

    utterance.onend = function () {
      speaking = false;
      setButtonsDisabled(false);
      speakBtn.disabled = false;
      speakBtn.textContent = "Speak Result";
    };

    utterance.onerror = function (event) {
      console.error("Speech error:", event.error);
      speaking = false;
      setButtonsDisabled(false);
      speakBtn.disabled = false;
      speakBtn.textContent = "Speak Result";
    };

    speechSynthesis.speak(utterance);
  }

  // ============================================================
  // Event listeners
  // ============================================================

  document.getElementById("btn-scenario-1").addEventListener("click", function () { runScenario(1, this); });
  document.getElementById("btn-scenario-2").addEventListener("click", function () { runScenario(2, this); });
  document.getElementById("btn-scenario-3").addEventListener("click", function () { runScenario(3, this); });
  document.getElementById("btn-scenario-4").addEventListener("click", function () { runScenario(4, this); });
  document.getElementById("btn-scenario-5").addEventListener("click", function () { runScenario(5, this); });

  speakBtn.addEventListener("click", function () {
    var text = speakBtn.getAttribute("data-speech");
    if (text) speakText(text);
  });

  // ============================================================
  // Fetch and validate rules on load
  // ============================================================

  function init() {
    initSpeech();
    rulesUrlEl.textContent = RULES_URL;

    fetch(RULES_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status + " " + response.statusText);
        }
        return response.json();
      })
      .then(function (data) {
        // Validate with SDK
        var validation = sdk.validateRules(data);
        if (!validation.valid) {
          rulesStatusEl.textContent = "Rules file failed schema validation.";
          venueNameEl.textContent = "Validation Error";
          console.error("Validation errors:", validation.errors);
          return;
        }

        // Store rules and update UI
        rules = data;
        venueNameEl.textContent = rules.venue_name;
        rulesStatusEl.textContent = "Rules loaded and validated successfully (schema v" + rules.schema_version + ")";

        // Enable scenario buttons
        for (var i = 0; i < scenarioBtns.length; i++) {
          scenarioBtns[i].disabled = false;
        }

        console.log("Rules loaded:", rules.venue_name, "— schema v" + rules.schema_version);
      })
      .catch(function (err) {
        venueNameEl.textContent = "Error";
        rulesStatusEl.textContent = "Failed to fetch rules: " + err.message;
        console.error("Fetch error:", err);
      });
  }

  init();
})();
