# Block Editor Enhancement Plan

## Overview

This document outlines the implementation plan for improving the blocks editing experience in the CMS. The goal is to add side-by-side block preview, drag-and-drop reordering, and copy/paste functionality to the CMS block editor.

---

## 1. Admin Split-Pane Layout + Live Preview

### Goal
Show a live preview of the page's blocks next to the form in the admin editor.

### Files to Modify
- `src/runtime/pages/admin/[collection]/[id].vue`
- `src/runtime/pages/admin/[collection]/create.vue`

### Implementation Details

**Layout Changes:**
- Detect if the collection has blocks enabled (`collection.value?.blocks?.enabled`)
- When enabled, switch the `#body` from a single centered column (`max-w-3xl`) to a two-column layout:
  - **Left (`lg:w-1/2`)**: The existing form with all fields
  - **Right (`lg:w-1/2`)**: A sticky preview pane
- On smaller screens, stack the preview below the form for responsive design
- Pass the current `formData.value[fieldName]` (default: `blocks`) to the preview component

**New Component:** `src/runtime/components/CmsBlocksPreview.vue`

**Props:**
```typescript
interface Props {
  blocks: BlockItem[]
}
```

**Features:**
- Renders blocks using the existing `RenderBlocks` component
- Header with "Preview" label and manual refresh button
- Empty state when no blocks are present
- Handles missing block components gracefully with error boundaries
- Live updates via Vue reactivity (automatic refresh)
- Manual refresh button increments a `:key` to force remount if needed

---

## 2. Fix Block Component Resolution for Admin Context

### Goal
Ensure block components resolve correctly in the admin panel for any consuming project.

### Files to Modify
- `src/runtime/components/RenderBlocks.vue`
- `src/runtime/composables/useRenderBlocks.ts`

### Problem
Both files currently fall back to a hardcoded `../../../../playground/cms/blocks/` path, which:
- Only works inside this repository
- Breaks in consuming projects
- Fails in admin panels of external projects

### Solution
Replace the hardcoded fallback with the virtual `#cms/blocks` module using `loadBlockComponent`.

**Before:**
```typescript
const asyncComponent = defineAsyncComponent(() => 
  import(`../../../../playground/cms/blocks/${blockType}.vue`)
)
```

**After:**
```typescript
const asyncComponent = defineAsyncComponent(async () => {
  const blocksModule = await import('#cms/blocks')
  const component = await blocksModule.loadBlockComponent(blockType)
  return component || { 
    template: `<div class="p-4 bg-red-50 text-red-600 rounded">Block not found</div>` 
  }
})
```

### Importance
This is a prerequisite for the admin preview to work reliably in all contexts.

---

## 3. Drag-and-Drop Reordering

### Goal
Allow users to reorder blocks via drag-and-drop in addition to the existing arrow buttons.

### File to Modify
`src/runtime/components/CmsBlockEditor.vue`

### Implementation Details

**UI Changes:**
- Add a drag handle (`i-lucide-grip-vertical`) to the **top-left** of each block header
- Position the drag handle across from the arrow buttons (top-right)
- Keep the existing **up/down arrow buttons** as an alternative navigation method

**Drag and Drop Implementation:**
- Use native HTML5 drag-and-drop API (zero dependencies)
- Implement on each block row:
  - `@dragstart`: Record the source index and set drag effect
  - `@dragover`: Prevent default, highlight the drop target
  - `@drop`: Reorder the array and emit the update
  - `@dragend`: Clear all visual states

**Visual Feedback:**
- Reduced opacity on the dragged item (`opacity-50`)
- Highlighted border/ring on the potential drop target
- Smooth transitions for better UX

**Drop Zone:**
- Add a drop zone at the bottom of the list to allow dragging blocks to the end
- The drop zone should be visually distinct when active (dashed border, colored background)

**Array Reordering Logic:**
```typescript
function reorderBlocks(fromIndex: number, toIndex: number) {
  const newValue = [...props.modelValue]
  const [movedItem] = newValue.splice(fromIndex, 1)
  newValue.splice(toIndex, 0, movedItem)
  emit('update:modelValue', newValue)
}
```

---

## 4. Copy, Duplicate, and Paste (Clipboard)

### Goal
Enable users to copy blocks to clipboard, paste them within or across pages, and duplicate existing blocks.

### File to Modify
`src/runtime/components/CmsBlockEditor.vue`

### Implementation Details

**Context Menu:**
- Add a `UDropdownMenu` (three-dot icon `i-lucide-more-vertical`) next to the arrow buttons
- Keep the **delete button** (`i-lucide-trash`) as a separate quick-access button outside the menu

**Menu Items Per Block:**

1. **Duplicate** (`i-lucide-copy`)
   - Deep-clone the block with a new ID
   - Insert immediately after the current block
   - Uses `JSON.parse(JSON.stringify())` for deep cloning

2. **Copy to Clipboard** (`i-lucide-clipboard-copy`)
   - Serialize block to JSON
   - Write to `navigator.clipboard`
   - Show success/error toast notification

3. **Paste After** (`i-lucide-clipboard-paste`)
   - Read JSON from `navigator.clipboard`
   - Validate the shape (must have `type` and `data`)
   - Check block type against `allowedBlocks`
   - Generate a fresh UUID
   - Insert after the current block
   - Show success/error toast notification

**Global Paste Option:**
- Add a **"Paste from clipboard"** item in the main **"Add Block"** toolbar dropdown
- This allows appending blocks at the very end of the list

**Clipboard Validation:**
```typescript
function validateBlockData(parsed: unknown): parsed is BlockItem {
  return (
    parsed !== null &&
    typeof parsed === 'object' &&
    'type' in parsed &&
    'data' in parsed &&
    typeof (parsed as any).type === 'string' &&
    typeof (parsed as any).data === 'object'
  )
}
```

**Error Handling:**
- Handle `navigator.clipboard` permission errors gracefully
- Show toast notifications for all success/error states:
  - "Block copied to clipboard"
  - "Block pasted"
  - "Block duplicated"
  - "Clipboard does not contain a valid block"
  - "Failed to access clipboard"

---

## 5. Testing & Validation

### Commands to Run

```bash
# Linting
npm run lint

# Type checking
npm run test:types

# Unit tests
npm run test
```

### Test Coverage

Add targeted tests for:

1. **Array Reordering Helper**
   - Test moving from lower index to higher index
   - Test moving from higher index to lower index
   - Test moving to first position
   - Test moving to last position

2. **Clipboard Serialization/Deserialization**
   - Test valid block data validation
   - Test invalid data rejection
   - Test `allowedBlocks` filtering
   - Test UUID generation on paste

3. **Component Integration**
   - Test `CmsBlocksPreview` renders correctly
   - Test preview updates reactively
   - Test manual refresh functionality

---

## Trade-offs & Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Native HTML5 DnD** | Zero new dependencies. The block list is flat and single-axis, so native events are sufficient and lightweight. |
| **Page-level split pane** | Gives blocks enough horizontal space to render accurately while keeping the form uncluttered. |
| **Three-dot context menu** | Keeps the block header clean while grouping secondary actions (copy/duplicate/paste) together. |
| **`navigator.clipboard` API** | Required for cross-page paste functionality. Permission errors are handled gracefully with toast messages. |
| **Keep arrow buttons** | Maintains accessibility and provides a precise alternative to drag-and-drop. |
| **Drag handle icon** | Prevents accidental drags when clicking to expand/collapse blocks. |

---

## Success Criteria

- [ ] Admin edit/create pages show a split-pane layout when blocks are enabled
- [ ] Live preview updates as blocks are added, removed, or modified
- [ ] Manual refresh button forces preview re-render
- [ ] Blocks can be reordered via drag-and-drop using the grip handle
- [ ] Arrow buttons continue to work for reordering
- [ ] Visual feedback is clear during drag operations
- [ ] Each block has a context menu with Copy, Duplicate, and Paste options
- [ ] Copy serializes block to JSON and stores in clipboard
- [ ] Paste reads from clipboard and validates before inserting
- [ ] Duplicate creates a copy with new ID immediately after the original
- [ ] Global "Paste" option available in Add Block dropdown
- [ ] All clipboard operations show appropriate toast notifications
- [ ] Block components resolve correctly in admin preview
- [ ] No linting errors or TypeScript issues
- [ ] Existing tests pass

---

## Implementation Phases

### Phase 1: Foundation
1. Fix block component resolution in `RenderBlocks.vue` and `useRenderBlocks.ts`
2. Create `CmsBlocksPreview.vue` component
3. Update admin pages to use split-pane layout

### Phase 2: Drag and Drop
1. Add drag handle to block headers
2. Implement native HTML5 DnD events
3. Add visual feedback and drop zones

### Phase 3: Clipboard Operations
1. Add context menu with three-dot icon
2. Implement Copy, Duplicate, and Paste functionality
3. Add global Paste option to Add Block dropdown
4. Add toast notifications

### Phase 4: Testing
1. Run linting and type checking
2. Add unit tests for helper functions
3. Verify all success criteria are met

---

*Generated: Sat May 09 2026*
*Status: Ready for implementation*
