# CMS Settings Definition Support

Status: ready-for-agent

## Problem Statement

The CMS already lets users define **collections** with multiple records, but it has no first-class way to define **singleton / settings-like data** — a single admin page that edits a group of related values rather than a list of rows. Users currently have to abuse a single-item collection or build a custom admin page, which means they lose the collection-style form/widget authoring, validation, and auto-generated admin UI.

Settings data also tends to live in heterogeneous storage: some values are columns in a dedicated table, others are rows in an EAV key/value table, and sometimes values are sprinkled across unrelated tables. The CMS should let authors declare a settings group once and hide that storage complexity behind the same field/widget/validation model they already use for collections.

## Solution

Add a `defineSettings` factory that mirrors `defineCollection` / `defineCustomPage`. A **settings group** has a name, label, icon, and a form config (tabs/sections/fields) just like a collection. Each field declares where its value lives:

- `source` — explicit Drizzle table, column, and optional row selector.
- `key` — row key in a top-level EAV `storage` table declared once on the settings group.

The module generates a virtual settings registry, registers REST endpoints (`/api/cms/settings` and `/api/cms/settings/:name`), provides a `SettingsService` to read/update values across tables, and renders an auto-generated admin edit page linked from the CMS sidebar.

## User Stories

1. As a CMS user, I want to define a settings group with `defineSettings`, so that I get a dedicated admin page without writing a custom page.
2. As a CMS user, I want settings fields to use the same widgets and validation rules as collection fields, so that I don’t have to learn a second form system.
3. As a CMS user, I want to store each setting value in an arbitrary Drizzle table/column via `source`, so that I can edit values that are already modeled in my schema.
4. As a CMS user, I want to store many related settings in a single EAV table via `storage` + `key`, so that I don’t need one table per settings group.
5. As a CMS user, I want the settings admin page to appear in the CMS sidebar alongside collections and custom pages, so that I can discover it easily.
6. As a CMS user, I want settings updates to be validated before they are persisted, so that bad values are rejected with clear error messages.
7. As a CMS user, I want `beforeRead`, `beforeUpdate`, `afterUpdate`, and `validate` hooks on a settings group, so that I can transform or guard values like I do for collections.
8. As a CMS user, I want omitted fields in a settings update to remain unchanged, so that partial saves are safe.
9. As a CMS user, I want default values to be used when a stored setting has never been set, so that the form is pre-filled predictably.
10. As a CMS user, I want the settings API to return sanitized form metadata that strips server-only storage details, so that the client only receives what it needs to render the form.
11. As a CMS user, I want the module to emit an empty settings registry when no settings are configured, so that the CMS still boots without errors.
12. As a CMS maintainer, I want `defineSettings` to throw clear errors when a field is missing both `source` and `key`, or uses `key` without group-level `storage`, so that misconfigurations are caught at definition time.
13. As a CMS maintainer, I want settings endpoints to be registered before the collection catch-all route, so that `/admin/settings/:name` and `/api/cms/settings/:name` resolve correctly.
14. As a CMS maintainer, I want settings validation to reuse the existing field-validation loop, so that validation behavior stays consistent between collections and settings.
15. As a CMS maintainer, I want the new admin page to reuse the existing `CmsFormSection` component, so that form rendering stays consistent.

## Implementation Decisions

- **Settings definition surface.** Add a `SettingsDefinition` type with `name`, optional `label`/`description`/`icon`, optional EAV `storage`, `form`, and `hooks`. `form` reuses the tab/section layout from collection forms but carries `SettingsFieldConfig` instead of `FormFieldConfig`.

- **Field storage modes.** Each `SettingsFieldConfig` must declare exactly one of:
  - `source: SettingsFieldSource` — `{ table, column, match? }` where `match` is an exact-match row selector.
  - `key: string` — used with the group-level `storage` to produce an effective source `{ table, column: valueColumn, match: { [keyColumn]: key } }`.
  Relations are not supported for settings fields.

- **Factory validation.** `defineSettings` validates:
  - `name` is non-empty.
  - `form` exists and has either `tabs` or `sections`.
  - every field has exactly one of `source` or `key`.
  - `key` is only used when the group defines `storage`.
  It also applies defaults (`label = name`, `icon = 'i-lucide-settings'`).

- **Module registration.** Add `settings?: Record<string, string>` to module options. Generate a `#my-module/settings.mjs` virtual server module (empty array when none configured) so the boot plugin can always import it. Auto-import `defineSettings` alongside `defineCollection` and `defineCustomPage`.

- **Runtime registry.** Extend the existing collection registry in the Nitro database plugin with a parallel `settingsDefinitions` map and `registerSettingsDefinition` / `registerSettings` / `getSettingsDefinition` / `getAllSettingsDefinitions` helpers, re-exported through the Drizzle adapter utility.

- **Boot loading.** The existing Nitro db plugin imports settings from the virtual module and registers them after collections.

- **Settings service.** Implement a `SettingsService` bound to a `SettingsDefinition`:
  - `read()` resolves each field to an effective source, groups fields by `(table, match)`, queries the needed columns in one select per group, applies `defaultValue` when a value is missing, then runs `beforeRead`.
  - `update(data)` runs `beforeUpdate`, validates, groups changed fields by `(table, match)`, upserts each group inside a Drizzle transaction (update if a row matches, otherwise insert with `match` + columns), runs `afterUpdate`, and returns the result of `read()`.

- **Validation reuse.** Extract the core field-validation loop from the existing collection validation service into a reusable `validateFields` helper. `validateData` becomes a thin wrapper for collections; a new `validateSettings` helper walks settings fields and applies the same rules plus the group `validate` hook.

- **API endpoints.** Add:
  - `GET /api/cms/settings` — metadata list of all settings groups.
  - `GET /api/cms/settings/:name` — full settings state (`name`, `label`, `description`, `icon`, sanitized `form`, current `values`).
  - `PUT /api/cms/settings/:name` — partial update; returns `{ values }`.
  Storage details (`source`, `key`, `storage`) are stripped from the serialized form sent to the client, reusing the same RegExp → string and custom-function stripping logic used for collection forms.

- **Admin UI.** Add a settings edit page that fetches the full state, renders tabs/sections with the existing form components, submits the current `formData` via `PUT`, and shows loading/error/success states. Append settings items to the CMS sidebar navigation after custom pages.

- **Route ordering.** Register the settings API handlers and admin edit route **before** the collection catch-all routes so that `/settings/:name` wins over `/:collection`.

- **Playground fixture.** Use an EAV `settings` table for the common case and one `source` field pointing at a separate table to prove mixed storage works.

```ts
// Decision-rich prototype type shapes (from the design session)

export interface SettingsFieldSource {
  table: string
  column: string
  match?: Record<string, unknown>
}

export interface SettingsEavStorage {
  table: string
  keyColumn: string
  valueColumn: string
}

export interface SettingsFieldConfig
  extends Omit<FormFieldConfig, 'relation'> {
  source?: SettingsFieldSource
  key?: string
}

export interface SettingsHooks {
  beforeRead?: (data: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>
  beforeUpdate?: (data: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>
  afterUpdate?: (data: Record<string, unknown>) => void | Promise<void>
  validate?: (data: Record<string, unknown>) => ValidationError[] | Promise<ValidationError[]>
}

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

## Testing Decisions

- **What makes a good test:** assert external behavior (factory validation, endpoint payloads, persisted values) rather than internal grouping or private helpers.
- **Factory unit tests.** Mirror `defineCustomPage.test.ts`: default merging, missing name, missing form, missing field storage, `key` without `storage`, and field flattening from tabs/sections.
- **Validation tests.** Add cases for settings-specific validation errors and default-value handling, reusing the existing validation test style.
- **Service tests.** If mocking `getSchemaTable` / `getDrizzleConnection` is feasible, add a lightweight unit test for `SettingsService.read()` and `update()` covering EAV and sprinkled sources. If Drizzle mocking is too awkward, cover the service through the playground fixture or a fixture test.
- **Integration / fixture.** Create a playground settings group with EAV storage plus a sprinkled field, then manually verify the sidebar, form rendering, save, and persisted rows. Optionally add an automated fixture test under `test/fixtures/basic` once the manual path is confirmed.
- **Type checking.** Run `test:types` after adding new runtime types, module options, virtual module declarations, and playground usage.

## Out of Scope

- Complex row selectors beyond exact-match equality (`source.match`).
- Relations in settings fields.
- Multi-row settings groups (settings are always edited as a single group of values).
- Versioning, media handling, or collection-style list views for settings.
- Coercing values to the underlying Drizzle column type beyond what Drizzle/libSQL already does (e.g., JSON storage is the user’s responsibility via column type / widget choice).
- Generic migration tooling; the playground fixture creates its own Drizzle migration.

## Further Notes

- The existing collection form serialization strips `fn` from custom validation rules and converts `RegExp` to strings with `_isRegex`. The settings serializer must do the same.
- The virtual settings module should always export `settings` (even as an empty array) so the Nitro plugin can import it unconditionally.
- Partial updates are intentional: only keys present in the `PUT` body are written, so the UI can save one tab without overwriting values from another.
- If a group has no `storage`, fields must use `source`; if a group has `storage`, fields may use `key` for convenience but can still use `source` for values outside the EAV table.
- The proposed seams are the runtime type layer, the module virtual-template / route layer, the Nitro registry/service layer, and the admin layout/page layer — the same seams used for collections and custom pages. If any of these seams feel wrong, reply before implementation starts.
