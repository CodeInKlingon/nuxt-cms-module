# Define, register, and list settings groups

Status: completed

## Parent

Parent PRD: `.scratch/cms-settings-definition/PRD.md`

## What to build

Add first-class runtime support for settings groups. Introduce the `SettingsDefinition`, `SettingsFieldConfig`, `SettingsFieldSource`, `SettingsEavStorage`, `SettingsFormConfig`, and `SettingsHooks` types. Implement a `defineSettings` factory that applies defaults (`label`, `icon`) and throws clear errors for missing names, missing forms, fields without storage, and `key` fields without group-level `storage`. Wire settings into the module lifecycle: add `cms.settings` module options, generate a virtual `#my-module/settings.mjs` registry (always exporting `settings`), register settings definitions in the Nitro database plugin, and expose `GET /api/cms/settings` to list configured groups with sanitized metadata. Register settings API routes and admin routes before the collection catch-all so `/settings/:name` resolves correctly.

This slice covers user stories 1, 10, 11, 12, and 13.

```ts
// Decision-rich type shape from the parent PRD
export interface SettingsDefinition {
  name: string
  label?: string
  description?: string
  icon?: string
  storage?: SettingsEavStorage
  form: SettingsFormConfig
  hooks?: SettingsHooks
}
```

## Acceptance criteria

- [x] `defineSettings` returns a definition with defaulted `label` and `icon`.
- [x] `defineSettings` throws on missing name, missing form, fields without `source` or `key`, and `key` fields without top-level `storage`.
- [x] The module boots cleanly when `cms.settings` is empty or omitted.
- [x] `GET /api/cms/settings` returns sanitized metadata (name, label, description, icon, form with validation rules serialized) for all configured settings groups.
- [x] Settings routes are registered before collection catch-all routes.

## Blocked by

None - can start immediately
