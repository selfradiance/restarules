# Portable Compliance Test Vectors

Language-agnostic input/output pairs for verifying a RestaRules decision procedure implementation against the specification.

## Format

`vectors.json` contains an array of test vector objects. Each vector has:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique vector identifier (e.g., `"V01"`) |
| `description` | string | Plain-English description of what the test checks |
| `step` | number or null | Which decision procedure step produced the result (null = cross-cutting) |
| `check` | string | Which evaluator check to assert against (see below) |
| `input.rules` | object | A complete venue rules JSON object (validates against the schema) |
| `input.params` | object | Agent action parameters: `channel`, `action`, `partySize`, `targetTime`, `currentTime` |
| `input.absent_field` | string | For default_policy tests: which permission field is intentionally absent |
| `expected.permitted` | boolean or `"not_evaluated"` | Whether the action should be permitted |
| `expected.reason` | string | Short reason code describing the outcome |

## Check Types

| Check | What it tests |
|-------|---------------|
| `schema_validation` | Validates input.rules against the JSON Schema — expects failure |
| `channel` | Checks the channel determination result (Step 3, including per-action overrides) |
| `party_size` | Checks party size against auto_book_max (Step 6) |
| `booking_window` | Checks booking window evaluation (Step 7) |
| `deposit_policy` | Checks deposit policy surfacing (Step 8) |
| `default_policy` | Checks absent permission field behavior (Step 10) |
| `all_pass` | Verifies all applicable checks pass |

## Usage

### JavaScript (reference implementation)

```bash
node test/compliance/validate-vectors.js
```

This is included in `npm test` automatically.

### Other languages

1. Load `vectors.json`
2. For each vector:
   - If `check` is `"schema_validation"`: validate `input.rules` against the RestaRules JSON Schema
   - Otherwise: run your decision procedure with `input.rules` and `input.params`
3. Assert the result matches `expected.permitted` and `expected.reason`

The vectors use complete venue rules files (all required fields present) so implementations can validate against the schema before running the decision procedure.
