# Read and update settings values end-to-end (EAV)

Status: completed

## Parent

Parent PRD: `.scratch/cms-settings-definition/PRD.md`

## What to build

Build the core settings service and endpoints for groups that use top-level EAV storage (`storage` + `key`). Implement `SettingsService.read()` to resolve field sources, group by table/match, query columns, apply `defaultValue`, and run `beforeRead`. Implement `SettingsService.update(data)` to validate, upsert values inside a Drizzle transaction per group, run `beforeUpdate`/`afterUpdate`, and return the refreshed values. Wire `GET /api/cms/settings/:name` and `PUT /api/cms/settings/:name`. Create a playground fixture with an EAV `settings` table and at least one settings group to exercise the flow.

This slice covers user stories 2, 4, 6, 7, 8, 9, and 10.

## Acceptance criteria

- [x] `GET /api/cms/settings/:name` returns the current values for every field in the settings group.
- [x] Unset fields return their `defaultValue` when one is configured.
- [x] `beforeRead` and `beforeUpdate`/`afterUpdate` hooks run in the correct order.
- [x] `PUT /api/cms/settings/:name` updates only the fields present in the request body.
- [x] Validation failures return a 400 with a `ValidationError[]` payload.
- [x] The playground fixture persists EAV rows correctly after a save.

## Blocked by

- `.scratch/cms-settings-definition/issues/01-prefactor-reusable-validation.md`
- `.scratch/cms-settings-definition/issues/02-define-register-list-settings.md`
