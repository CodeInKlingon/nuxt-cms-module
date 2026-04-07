# Block Editor Testing Setup

## Configuration Complete! ✅

The block editor is now configured and ready to test in the playground app.

### What Was Added

#### 1. Database Schema (`playground/server/database/schema.ts`)
- Added `blocks` JSON column to the `pages` table
- Stores block data as JSON array
- **Automatic migration** - The database will automatically add the column if it doesn't exist

#### 2. Pages Collection (`playground/cms/collections/pages.ts`)
- Added `blocks` configuration to enable block editing
- Added new "Content" tab with Block Content field
- Configured allowed blocks: HeroSection, TextBlock, ImageBlock

#### 3. Sample Block Components (`playground/cms/blocks/`)

**HeroSection.vue**
- Title, subtitle, background color, CTA link
- Uses: textField, linkField

**TextBlock.vue**
- Heading and content
- Uses: textField, textareaField

**ImageBlock.vue**
- Image URL, alt text, caption, alignment
- Uses: textField, selectField

#### 4. Module Updates (`src/module.ts`)
- Added `CollectionBlocksConfig` type definition
- Added block component auto-discovery from `cms/blocks` directory
- Blocks are registered as global components

### How to Test

1. **Start the dev server:**
   ```bash
   cd /Users/daniel/Development/nuxt-cms-module/playground
   npm run dev
   ```

2. **Access the admin:**
   - URL: http://localhost:3000/admin
   - Password: admin123

3. **Create a page with blocks:**
   - Go to Pages → Create New
   - Fill in Page Details (title, slug)
   - Switch to "Content" tab
   - Use the "Block Content" field
   - Click "Add Block" to add HeroSection, TextBlock, or ImageBlock
   - Configure block fields
   - Save the page

4. **Edit existing pages:**
   - Go to Pages → click any page
   - Edit blocks in the Content tab
   - Reorder, remove, or add new blocks

### Expected Behavior

- Block editor shows "Add Block" button with dropdown
- Clicking a block type adds it to the list
- Blocks can be expanded/collapsed for editing
- Each block shows its specific fields (defined in the Vue component)
- Blocks can be reordered (up/down buttons)
- Blocks can be deleted
- Data is saved to the `blocks` JSON column

### Troubleshooting

**Database Issues:**
If you get an error about missing `blocks` column:
- The migration runs automatically when the server starts
- Check server console for migration logs
- If needed, manually add the column:
  ```sql
  ALTER TABLE pages ADD COLUMN blocks TEXT DEFAULT '[]';
  ```

If blocks don't appear in the dropdown:
1. Check that block components are in `playground/cms/blocks/`
2. Verify component names match `allowedBlocks` array
3. Check browser console for component resolution errors

**Block Component Loading:**
The block editor now dynamically loads block components and extracts their field definitions. When you expand a block:
1. It imports the Vue component from `~/cms/blocks/{BlockName}.vue`
2. Extracts field definitions from `defineProps()` 
3. Renders the fields using the widget system
4. Saves data back to the block's `data` object

If fields don't show:
1. Check browser console for import errors
2. Ensure block component uses field helpers (textField, linkField, etc.)
3. Verify the component file exists and is named correctly

### Next Steps

Once testing is complete, we can proceed with:
- **Phase 5**: Frontend rendering with `RenderBlocks` component
- Additional block types
- Block preview in editor
- Drag-and-drop reordering
