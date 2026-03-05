# RestaRules — Machine-readable agent conduct rules for restaurants

A JSON schema and hosting standard that lets restaurants publish machine-readable rules for AI agent interactions — covering disclosure requirements, allowed channels, rate limits, human escalation, and anti-resale constraints.

## Schema

The schema lives in `schema/`:

- `agent-venue-rules.schema.json` — Formal JSON Schema (Draft 2020-12). This is the source of truth for what a valid rules file looks like.
- `agent-venue-rules-example.json` — A complete example file for a fictional restaurant (The Golden Fork).

## Validation

To run schema validation:

```
npm install
npm test
```

`npm test` uses [AJV](https://ajv.js.org/) to validate the example file against the schema. Output on success:

```
PASS: Example validates against schema.
```
