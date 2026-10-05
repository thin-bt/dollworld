# PTG-031 — PTG-024 static meta-audit evidence

Status: `GPT-ONLY / SOURCE-REVIEW EVIDENCE / NOT PRODUCT ACCEPTANCE`

Date: 2026-10-05 (Asia/Tokyo)

## 1. Scope and pinned authority

This evidence audits the schema document itself. It does not validate a product evidence bundle, run the 45 PTG-025 vectors, execute browser/runtime acceptance, or replace the PTG-026 validator gate.

| Item | Pinned value |
|---|---|
| Repository | `thin-bt/dollworld` |
| Branch | `master` |
| Schema path | `_handoff-artifacts/results/ROLE3-S03-006-PARENT-GUIDANCE-ORDINARY-BROWSER-20260930-R1/PTG-024-acceptance-evidence-bundle-schema.json` |
| Audited PTG-024 blob | `02113e8de2fa5399329bf2910d679dc695435daa` |
| Audited byte length | `26027` |
| Declared dialect | `https://json-schema.org/draft/2020-12/schema` |

## 2. Audit procedure

The audit parsed the exact master bytes with a JSON object-pairs hook and then recursively inspected every object and array. The following checks were run without modifying PTG-024:

1. reject duplicate JSON object keys before ordinary object construction;
2. require every `required` array to be non-empty, string-only, and unique;
3. require every `enum` array to be non-empty and unique;
4. require every `type` value to use a Draft 2020-12 primitive name, with no duplicate array members;
5. resolve every document-local JSON Pointer in `$ref`, including `~0` and `~1` decoding;
6. require `$defs`, `properties`, `patternProperties`, and `dependentSchemas` to be objects when present;
7. require `allOf`, `anyOf`, and `oneOf` to be non-empty arrays when present;
8. require schema-valued keywords (`items`, `contains`, `not`, `if`, `then`, `else`, `additionalProperties`, `unevaluatedProperties`, and `propertyNames`) to contain an object or boolean schema;
9. require the inspected size-limit keywords to be non-negative integers and reject inverted min/max pairs;
10. compile every `pattern` as a regular expression;
11. enumerate `$defs` reachability from document-local `$ref` values.

## 3. Results

| Check | Result |
|---|---:|
| JSON parse | PASS |
| Duplicate object keys | 0 |
| Recursively visited object/schema nodes | 426 |
| `required` arrays / members | 53 / 144 |
| Duplicate or non-string `required` members | 0 |
| `enum` arrays / members | 20 / 91 |
| Duplicate `enum` members | 0 |
| Document-local `$ref` values | 61 |
| Unresolved document-local `$ref` values | 0 |
| `$defs` entries / referenced entries | 17 / 17 |
| Unreferenced `$defs` entries | 0 |
| Compiled `pattern` values | 1 |
| Composition arrays inspected | 2 |
| Static keyword/type/range issues | 0 |

The earlier inspection hypothesis that `attempt.required` repeated `assignmentId` was not reproduced against the pinned master blob. The exact array contains `assignmentId` once. No schema write is justified by that hypothesis.

## 4. Verdict and boundary

**Static audit verdict: PASS for the checks in section 2.**

This is narrower than full Draft 2020-12 meta-schema validation. No generic Draft 2020-12 validator or locally cached official meta-schema was available in the execution environment, so this evidence must not be represented as a complete dialect-conformance result.

Consequently:

- PTG-024 remains unchanged at blob `02113e8de2fa5399329bf2910d679dc695435daa`;
- PTG-025 remains the 45-vector conformance authority;
- PTG-026 still requires validator implementation plus two identical complete 45-vector passes;
- no lane, scenario, or product acceptance verdict changes;
- Cursor, browser acceptance, and runtime execution remain out of scope.

## 5. Reproduction contract

A future full meta-schema run must record the validator implementation and version, the official Draft 2020-12 meta-schema source or package pin, PTG-024 blob, invocation, exit status, and complete diagnostics. A passing generic validator may extend this evidence, but it cannot substitute for the PTG-025 semantic vectors or PTG-026 acceptance gate.
