# Implementation Plan

## Current State

The module is in alpha (`0.1.0`). Core features are functional and the package can be installed and used in a Nuxt 4 project.

### Implemented

- [x] Drizzle ORM integration
- [x] Collection definitions with schema binding
- [x] Auto-generated REST API
- [x] Admin dashboard (login, list, create, edit)
- [x] Field validation system
- [x] Lifecycle hooks
- [x] Relation system (inline, inverse, junction)
- [x] Block system with DnD editor
- [x] Widget system with built-in widgets
- [x] Custom admin pages
- [x] Custom auth handler
- [x] Nuxt 4 compatibility

### In Progress / Planned

See [TODO.md](./TODO.md) for the detailed task list.

## Architecture

- **Package**: `packages/nuxt-module/` — the Nuxt module
- **Playground**: `apps/playground/` — development playground app
- **Module entry**: `src/module.ts`
- **Runtime**: `src/runtime/` (composables, components, layouts, pages, server API, services)

See [AGENTS.md](./AGENTS.md) for development conventions.
