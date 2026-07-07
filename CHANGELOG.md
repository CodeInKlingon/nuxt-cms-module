# Changelog

## v0.1.0-alpha

Initial alpha release of `@codeinklingon/nuxt-cms`.

### Features

- Collection CRUD with Drizzle ORM integration
- Auto-generated REST API endpoints (`/api/cms/:collection`)
- Admin dashboard with login, list/create/edit forms
- Field-level validation (required, min, max, pattern, email, url, custom)
- Lifecycle hooks (beforeCreate, afterCreate, beforeUpdate, afterUpdate, beforeDelete, afterDelete, validate)
- Relation field support (inline, inverse, junction strategies)
- Block system with drag-and-drop editor
- Widget system with built-in widgets (Text, Number, Textarea, Boolean, Select, Link, Blocks, Relation)
- Custom admin pages via `defineCustomPage()`
- Custom auth handler support
- `defineWidget()` for user-defined widgets
- Nuxt 4 compatibility
