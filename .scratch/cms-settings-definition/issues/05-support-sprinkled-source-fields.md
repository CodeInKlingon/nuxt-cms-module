# Support sprinkled fields via per-field `source`

Status: completed

## Parent

Parent PRD: `.scratch/cms-settings-definition/PRD.md`

## What to build

Extend the settings service to handle fields that declare their own `source` (table, column, optional `match`) instead of relying on group-level EAV storage. The service must resolve each field to an effective source, group fields by `(table, JSON.stringify(match || {}))`, and read/update each group independently. A missing schema table or ambiguous field config must produce a clear server error. Update the playground fixture to mix EAV `key` fields with one `source` field pointing at a separate table so both paths are exercised together.

This slice covers user story 3.

## Acceptance criteria

- [x] A field with `source` reads from and writes to the declared table, column, and matched row.
- [x] A settings group can contain both `key` (EAV) fields and `source` fields, and a single update writes to the correct tables.
- [x] Omitting `match` reads/updates the first row of a single-row table, and inserts a new row when the table is empty.
- [x] Missing schema table or fields with both `source` and `key` produce clear 500/validation errors.
- [x] The playground fixture demonstrates mixed EAV and sprinkled storage.

## Blocked by

- `.scratch/cms-settings-definition/issues/03-read-update-eav-settings.md`
