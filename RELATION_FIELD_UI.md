# Relation Field — Implementation Plan

## Goals

- End-to-end working relation field in collection forms.
- Support `one` and `many` relations with explicit storage strategies.
- All writes run inside a single Drizzle transaction.
- Reuse the target collection's `dashboard.list` configuration for the picker and card display.
- Relation details are fetched separately by the edit form, not bundled with the main record payload.

---

## `RelationConfig`

Storage is declared explicitly. There is no auto-detection and no default column naming.

```ts
export interface RelationConfig {
  /** Cardinality from the source collection's point of view. */
  type: 'one' | 'many'

  /** Target collection name. */
  collection: string

  /** Physical storage strategy. */
  storage: 'inline' | 'inverse' | 'junction'

  // --- inline: FK column on the source table ---
  sourceColumn?: string

  // --- inverse: FK column on the target table ---
  targetColumn?: string

  // --- junction: separate many-to-many table ---
  junctionTable?: string | any
  sourceJunctionColumn?: string
  targetJunctionColumn?: string

  /** Enable drag-to-reorder for junction relations. */
  sortable?: boolean

  /** Column that stores the order index for sortable junction relations. */
  orderColumn?: string
}
```

### Valid combinations

| `type` | Allowed `storage` | Reason |
|--------|-------------------|--------|
| `one` | `inline` | A single FK column on the source table. |
| `one` | `junction` | A junction table with a unique constraint on the source side enforces one related record. |
| `many` | `inverse` | FK column on the target table (one-to-many from source). |
| `many` | `junction` | Classic many-to-many junction table. |

Any other combination throws a clear configuration error.

### Column naming is explicit

The user must provide every storage-specific column name. The module does not infer `sourceColumn`, `targetColumn`, or junction column names from field/collection names.

---

## Frontend architecture

The existing collection list page is refactored into reusable pieces. The relation picker is then built from those same pieces.

### New files

1. **`src/runtime/composables/useCollectionList.ts`**
   - Accepts a `collectionName` and optional initial state.
   - Owns `search`, `page`, `pageSize`, `sortField`, `sortOrder`, `activeFilters`.
   - Builds query params, performs the fetch, and exposes `items`, `total`, `pending`, `refresh`, `deleteItem`.

2. **`src/runtime/components/CmsListToolbar.vue`**
   - Search input + filter dropdowns.
   - Reads `dashboard.list.filters` and `options.searchColumns` from the collection metadata.
   - Binds to the state returned by `useCollectionList`.

3. **`src/runtime/components/CmsListTable.vue`**
   - Renders `UTable` + pagination.
   - Props include `selectable`, `selectionMode`, and `selectedIds`.
   - Emits `update:selectedIds`, `update:sort`, and `refresh`.
   - Provides an `#actions` slot for the normal list page and a selection checkbox column for the picker.

4. **`src/runtime/components/RelationPickerModal.vue`**
   - Uses `useCollectionList`, `CmsListToolbar`, and `CmsListTable`.
   - Enables selection and emits the chosen ids.
   - Uses the target collection's `dashboard.list` config for columns/filters/search.

5. **`src/runtime/widgets/built-ins/RelationWidget.vue`**
   - Renders selected relation cards.
   - Opens `RelationPickerModal`.
   - Fetches selected-record details from the dedicated relation endpoint.

### Files to update

- `src/runtime/components/CmsFieldWidget.vue` — remove the relation placeholder block so relation fields route through `CmsWidgetRenderer`.
- `src/runtime/components/CmsWidgetRenderer.vue` — add `relation` to the built-in widget map.
- `src/runtime/pages/admin/[collection]/index.vue` — refactor to use `useCollectionList`, `CmsListToolbar`, and `CmsListTable`.
- `src/module.ts` — register `relation` as a built-in widget in the generated registry and type declarations.

### Card display

Selected relation cards reuse the target collection's `dashboard.list.columns` (via `CmsCellRenderer`). If the target collection has no list config, the card falls back to showing the raw id.

---

## Relation read endpoint

The edit form widget fetches relation details separately.

```
GET /api/cms/:collection/:id/relations/:field
```

Returns the related target record(s):

```json
[
  { "id": 1, "title": "Welcome" },
  { "id": 2, "title": "About" }
]
```

Resolution logic:

- **`inline`** — read `sourceColumn` from the source row, then fetch the target row.
- **`inverse`** — query target table where `targetColumn = id`.
- **`junction`** — query the junction table where `sourceJunctionColumn = id`, then fetch target rows. If `sortable`, order by `orderColumn`.

This endpoint is registered before the catch-all collection route.

---

## Server-side persistence

All create, update, and delete operations run inside a Drizzle transaction.

### Create / update flow

```ts
return await this.db.transaction(async (tx) => {
  // 1. Run beforeCreate / beforeUpdate hook
  // 2. Split payload into main-record data and relation values
  const { mainData, relationValues } = this.extractRelations(data)

  // 3. Validate only the main-record payload
  const result = await validateAndCoerce(this.collection, mainData)
  if (!result.success) throw new ValidationError(result.errors)

  // 4. Insert/update main record using tx
  const [record] = id
    ? await tx.update(this.schema).set(result.data).where(eq(this.schema.id, id)).returning()
    : await tx.insert(this.schema).values(result.data).returning()

  // 5. Persist relations using tx
  await this.writeRelations(tx, record.id, relationValues)

  // 6. Run afterCreate / afterUpdate hook
  return record
})
```

### Per-storage write behavior

| Storage | `type: 'one'` | `type: 'many'` |
|---|---|---|
| `inline` | Map relation value to `sourceColumn` in the main payload. | Not supported. |
| `inverse` | Update chosen target row → `targetColumn = sourceId`; clear any other row already pointing to this source. | Update selected targets → `targetColumn = sourceId`; unselected linked targets → `targetColumn = null`. |
| `junction` | Delete existing rows for this source, insert one. | Delete existing rows for this source, insert selected ids. If `sortable`, write `order` values matching the array order. |

### Delete flow

Inside the same transaction before deleting the main record:

- `inline` — nothing extra.
- `inverse` — set `targetColumn = null` for all linked target rows.
- `junction` — delete all junction rows for the source id.

### Validation adjustment

`validateAndCoerce` only sees the main-record payload:

1. Extract relation fields from the raw payload.
2. For `inline`, map the field value to `sourceColumn` and keep it in the payload.
3. For `inverse` and `junction`, remove the relation field from the payload.
4. Run `validateAndCoerce`.

### Client-side serialization

`junctionTable` may be an actual Drizzle table object. The collection metadata endpoint (`/api/cms/collections`) must strip non-serializable relation config keys before sending them to the client.

---

## Playground updates

- Add `order` column to `productsToPages` in `playground/server/database/schema.ts`.
- Regenerate the Drizzle migration.
- Update seed data in `playground/server/plugins/db-init.ts` to include `order` values.
- Update `playground/cms/collections/products.ts` and `pages.ts` relation configs to use explicit column/table names.

---

## Implementation order

1. Update `RelationConfig` type and validation of allowed combinations.
2. Add the relation read endpoint (`/api/cms/:collection/:id/relations/:field`).
3. Implement transaction-wrapped relation writes in `CrudService`.
4. Strip relation fields before `validateAndCoerce` and map inline relations.
5. Refactor the list page into `useCollectionList`, `CmsListToolbar`, and `CmsListTable`.
6. Build `RelationPickerModal.vue` and `RelationWidget.vue`.
7. Wire relation through `CmsFieldWidget.vue` and `CmsWidgetRenderer.vue`.
8. Register the relation widget in the module registry and types.
9. Update the playground schema, migration, seed data, and collection configs.
10. Add tests for each storage strategy and transaction rollback behavior.
