// RestaRules Voice Demo — app.js
// SDK is available as window.RestaRulesSDK (loaded from bundle.js)

(function () {
  "use strict";

  var RULES_URL = "https://selfradiance.github.io/restarules/.well-known/agent-venue-rules.json";
  var sdk = window.RestaRulesSDK;
  var rules = null;

  // DOM elements
  var venueNameEl = document.getElementById("venue-name");
  var rulesUrlEl = document.getElementById("rules-url");
  var rulesStatusEl = document.getElementById("rules-status");
  var scenarioBtns = document.querySelectorAll(".scenario-btn");

  // Fetch and validate rules on load
  function init() {
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
        console.log("Validation:", validation);
      })
      .catch(function (err) {
        venueNameEl.textContent = "Error";
        rulesStatusEl.textContent = "Failed to fetch rules: " + err.message;
        console.error("Fetch error:", err);
      });
  }

  init();
})();
