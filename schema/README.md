# RestaRules Schema v0.1

This folder contains the formal schema definition and an example file for RestaRules agent venue rules.

## Files

- `agent-venue-rules.schema.json` — The formal JSON Schema definition (Draft 2020-12). This is the source of truth for what a valid rules file looks like.
- `agent-venue-rules-example.json` — A complete example file for a fictional restaurant (The Golden Fork).

## Required vs Optional Fields

A valid rules file **must** include these 8 fields:

- `schema_version` — Must be `"0.1"` for this version
- `venue_name` — The restaurant's name
- `venue_url` — The restaurant's website
- `last_updated` — When the file was last edited (YYYY-MM-DD)
- `effective_at` — When the rules take effect (YYYY-MM-DD)
- `default_policy` — Either `"deny_if_unspecified"` or `"allow_if_unspecified"`
- `disclosure_required` — Whether AI agents must identify themselves before interacting
- `allowed_channels` — Which communication channels the venue permits agents to use

The remaining 4 fields are **optional**:

- `rate_limits` — How frequently a single agent may perform specific actions
- `human_escalation_required` — Party size threshold and conditions requiring human handoff
- `third_party_restrictions` — Rules on resale, transfer, and identity-bound bookings
- `complaint_endpoint` — URL for reporting agent misbehavior to the venue

A venue includes only the optional rules it wants to set. The `default_policy` field tells agents what to assume for everything not explicitly covered.

## Field Classifications: Permission vs Informational

Every field in the schema is classified as either a **permission field** or an **informational field**:

- **Permission fields** govern whether an agent action is allowed. When a permission field is absent, agents consult `default_policy` to decide whether the action is permitted.
- **Informational fields** describe venue terms or metadata. Absence of an informational field never blocks an agent action and is not governed by `default_policy`.

### Permission fields (governed by default_policy)

| Field | Version |
|-------|---------|
| `disclosure_required` | v0.1 |
| `allowed_channels` | v0.1 |
| `rate_limits` | v0.1 |
| `human_escalation_required` | v0.1 |
| `third_party_restrictions` | v0.1 |
| `party_size_policy` | Planned for v0.2 |
| `deposit_policy` | Planned for v0.2 |
| `user_acknowledgment_requirements` | Planned for v0.2 |

### Informational fields (never block agent actions)

| Field | Version |
|-------|---------|
| `complaint_endpoint` | v0.1 |
| `venue_currency` | v0.2 |
| `venue_timezone` | v0.2 |
| `cancellation_policy` | Planned for v0.2 |
| `no_show_policy` | Planned for v0.2 |

This classification was established in Session 12 and is a core design principle of the schema.

## How to Validate

You can validate any rules file against the schema using Python:

```bash
pip install jsonschema
```

```python
import json
from jsonschema import validate, Draft202012Validator

with open("agent-venue-rules.schema.json") as f:
    schema = json.load(f)

with open("your-rules-file.json") as f:
    rules = json.load(f)

validate(instance=rules, schema=schema, cls=Draft202012Validator)
print("Valid!")
```

If the file is invalid, the validator will tell you exactly which field failed and why.
