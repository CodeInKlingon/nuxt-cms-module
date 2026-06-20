# Prefactor: reusable field-validation loop

Status: completed

## Parent

Parent PRD: `.scratch/cms-settings-definition/PRD.md`

## What to build

Extract the core field-validation loop from the existing collection validation service into a generic `validateFields(fields, data, validateHook?)` helper. The helper must work for both collection form fields and the new settings fields. Keep `validateData` as a thin wrapper for collections, and add a new `validateSettings(definition, data)` helper that calls `validateFields` with the flattened settings fields and the settings-level `validate` hook.

This slice covers user stories 14 (validation reuse), and lays the groundwork for 2 and 6.

## Acceptance criteria

- [x] A new `validateFields(fields, data, validateHook?)` function exists and is used by collection validation.
- [x] Existing collection validation tests still pass without behavior changes.
- [x] `validateSettings(definition, data)` returns the same `ValidationError[]` shape as collection validation.
- [x] A hand-constructed settings field list can be validated end-to-end through the new helpers.

## Blocked by

None - can start immediately
