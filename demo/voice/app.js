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

    var decision;
    switch (scenarioNum) {
      case 2:
        runScenario2();
        break;
      default:
        addTraceItem("...", "Scenario " + scenarioNum + " not yet implemented");
        break;
    }
  }

  // Scenario 2: Book for 4 by phone
  function runScenario2() {
    var decision = sdk.evaluateCompliance(rules, {
      channel: "phone",
      partySize: 4,
    });

    // Trace: disclosure
    if (decision.disclosure.required) {
      addTraceItem("\u2713", "Disclosure required — agent must identify as AI");
    } else {
      addTraceItem("\u2713", "Disclosure not required");
    }

    // Trace: channel
    if (decision.channel.result === "ALLOWED") {
      addTraceItem("\u2713", "Channel 'phone' is allowed");
    } else {
      addTraceItem("\u2717", "Channel 'phone' is denied");
    }

    // Trace: party size
    if (decision.partySize.result === "ALLOWED") {
      addTraceItem("\u2713", "Party size 4 is within auto-book limit (max: " + decision.partySize.autoMax + ")");
    } else {
      addTraceItem("\u2717", "Party size 4 requires escalation");
    }

    // Show result
    var speechText = "Scenario: Book a table for 4 by phone at " + rules.venue_name + ". " +
      "First, I must disclose that I am an AI. The required phrasing is: " + (decision.disclosure.phrasing || "I am an AI assistant.") + " " +
      "Checking the channel: phone is allowed. " +
      "Checking party size: a party of 4 is within the auto-book maximum of " + decision.partySize.autoMax + ". " +
      "Result: This booking is ALLOWED. The agent may proceed.";

    showResult("allowed", "ALLOWED", "A party of 4 booking by phone is permitted. The agent must disclose its AI identity before proceeding.", speechText);

    addTriggeredRule("disclosure_required.enabled: true");
    addTriggeredRule("allowed_channels: [\"phone\", \"web\"] \u2192 phone is permitted");
    addTriggeredRule("party_size_policy.auto_book_max: " + decision.partySize.autoMax + " \u2192 party of 4 is within limit");
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
