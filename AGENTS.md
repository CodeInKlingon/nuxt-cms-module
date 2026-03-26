# AGENTS.md

Agent guide for `starter-module` (Nuxt module: `nuxt-cms`).
Use this as the default operating manual for coding agents working in this repo.
check 
[text](IMPLEMENTATION_PLAN.md) for more information on this project. 

## Project Snapshot

- Package manager: `npm` (lockfile: `package-lock.json`).
- Language: TypeScript (`type: module`).
- Framework: Nuxt module + Nuxt playground.
- Tests: Vitest (+ `@nuxt/test-utils` for e2e-style fixture test).
- Lint: ESLint flat config via `@nuxt/eslint-config`.
- Build artifacts: `dist/`.
- Generated dev artifacts: `.nuxt/`.

## Source Layout

- Module entry: `src/module.ts`.
- Runtime composables/types: `src/runtime/composables/`, `src/runtime/types.ts`.
- Runtime server code: `src/runtime/server/` (API, services, middleware, utils, plugins).
- Tests: `test/*.test.ts` and `test/fixtures/basic`.
- Playground app: `playground/`.

## Install And Setup

```bash
npm install
```

When types or stubs need refresh (often before tests/dev):

```bash
npm run dev:prepare
```

## Build, Lint, Test Commands

- Lint all files:

```bash
npm run lint
```

- Run all tests once:

```bash
npm run test
```

- Watch tests:

```bash
npm run test:watch
```

- Type-check module + playground:

```bash
npm run test:types
```

- Build module package output (`dist/`):

```bash
npm run prepack
```

- Build playground app:

```bash
npm run dev:build
```

- Run playground in dev mode:

```bash
npm run dev
```

## Running A Single Test (Important)

Preferred (direct Vitest):

```bash
npx vitest run test/defineCollection.test.ts
```

Run a single test by name pattern:

```bash
npx vitest run test/validation.test.ts -t "should fail validation for invalid email"
```

Equivalent via npm script argument passthrough:

```bash
npm run test -- test/defineCollection.test.ts
npm run test -- test/validation.test.ts -t "min length"
```

Useful debug variant:

```bash
npx vitest run test/basic.test.ts --reporter=verbose
```

## CI Expectations

From `.github/workflows/ci.yml`:

- Node version: 20.
- CI runs `npm run lint`.
- CI runs `npm run dev:prepare` before `npm run test`.
- Keep local validation aligned with CI to avoid surprises.

## Code Style: Formatting And Syntax

Follow existing style in `src/`, `test/`, and `playground/`:

- Indentation: 2 spaces (`.editorconfig`).
- Line endings: LF.
- UTF-8, final newline required.
- Use single quotes for strings.
- Omit semicolons.
- Trailing commas in multiline literals/params.
- Prefer `const`; use `let` only when reassigned.
- Keep functions focused and small when practical.

## Imports And Module Boundaries

- Group imports in this order:
  1) Node built-ins (for example `node:url`)
  2) External packages (for example `h3`, `drizzle-orm`, `vitest`)
  3) Nuxt aliases (for example `#imports`, `#app`)
  4) Relative local imports
- Use `import type` for type-only imports.
- Avoid unused imports; lint will flag them.
- Prefer explicit relative paths over deeply implicit behavior.

## TypeScript Guidelines

- Prefer explicit interfaces/types for public surfaces.
- Keep exported APIs typed (module options, runtime types, service returns).
- Use generics where they improve call-site safety (for example collection helpers).
- Avoid broad `any`; if unavoidable, constrain scope and document intent in code.
- Favor discriminated unions for variant behavior (existing `ValidationRule` pattern).
- Ensure async functions return `Promise<...>` explicitly when exported.

## Naming Conventions

- Files: `kebab-case` for runtime/server files; test files end with `.test.ts`.
- Variables/functions: `camelCase`.
- Types/interfaces/classes: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` for true constants (for example cookie keys).
- Test descriptions: sentence-style, behavior-focused (`should ...`).

## Error Handling Conventions

- API route layer (`h3` handlers): throw `createError({ statusCode, message })`.
- Service/domain layer: throw `Error` with actionable messages.
- Validate input early; fail fast with clear reason.
- Do not swallow exceptions silently.
- Preserve helpful status/message when wrapping caught errors.

## Testing Conventions

- Framework: Vitest (`describe`/`it`/`expect`).
- One behavior/assertion theme per test case.
- Cover success + failure paths for validators/services.
- Prefer deterministic data; avoid time/network randomness.
- For Nuxt fixture tests, keep setup local to the suite (`setup({ rootDir })`).

## Agent Working Rules For This Repo

- Do not edit generated outputs unless task explicitly targets them:
  - `.nuxt/`
  - `dist/`
- Make changes in source files under `src/`, `test/`, `playground/`.
- Run targeted tests for touched areas first, then broader checks as needed.
- If behavior changes, update/add tests in `test/`.
- Keep changes minimal and consistent with surrounding patterns.

## Cursor/Copilot Rule Files

Checked paths:

- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

Result: none of these rule files exist in this repository at the time of writing.

If these files are added later, treat them as authoritative repo-local instructions
and update this AGENTS.md to reflect any new constraints.

## Quick Pre-PR Checklist

- `npm run lint`
- `npm run test` (or targeted vitest command when iterating)
- `npm run test:types` for TS-sensitive changes
- Update docs/tests when public behavior changes
