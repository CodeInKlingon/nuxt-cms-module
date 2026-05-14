<template>
  <div class="cms-block-editor space-y-4">
    <!-- Add Block Toolbar -->
    <div class="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
      <UDropdownMenu
        :items="blockMenuItems"
        :disabled="availableBlocks.length === 0"
      >
        <UButton
          icon="i-lucide-plus"
          color="primary"
          :disabled="availableBlocks.length === 0"
        >
          Add Block
        </UButton>
      </UDropdownMenu>
    </div>

    <!-- Block List -->
    <TransitionGroup
      name="block-list"
      tag="div"
      class="space-y-2"
    >
      <div
        v-for="(block, index) in modelValue"
        :key="block.id"
        class="border rounded-lg bg-white overflow-hidden transition-all"
        :class="{
          'ring-2 ring-primary-500': selectedId === block.id,
          'opacity-50': draggingIndex === index,
          'ring-2 ring-primary-300': dragOverIndex === index && draggingIndex !== index,
        }"
        draggable="true"
        @dragstart="onDragStart($event, index)"
        @dragover.prevent="onDragOver($event, index)"
        @drop.prevent="onDrop($event, index)"
        @dragend="onDragEnd"
      >
        <!-- Block Header -->
        <div
          class="flex items-center justify-between p-3 bg-gray-50 border-b cursor-pointer"
          @click="toggleBlock(block.id)"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-grip-vertical"
              class="text-gray-400 cursor-grab active:cursor-grabbing"
              @click.stop
            />
            <UIcon
              :name="getBlockIcon(block.type)"
              class="text-gray-400"
            />
            <span class="font-medium text-sm">
              {{ getBlockLabel(block.type) }}
            </span>
          </div>

          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-chevron-up"
              size="xs"
              variant="ghost"
              :disabled="index === 0"
              @click.stop="moveBlock(index, -1)"
            />
            <UButton
              icon="i-lucide-chevron-down"
              size="xs"
              variant="ghost"
              :disabled="index === modelValue.length - 1"
              @click.stop="moveBlock(index, 1)"
            />
            <UDropdownMenu :items="getBlockContextMenuItems(index)">
              <UButton
                icon="i-lucide-more-vertical"
                size="xs"
                variant="ghost"
                @click.stop
              />
            </UDropdownMenu>
            <UButton
              icon="i-lucide-trash"
              size="xs"
              variant="ghost"
              color="error"
              @click.stop="removeBlock(index)"
            />
          </div>
        </div>

        <!-- Block Fields (when selected) -->
        <div
          v-if="selectedId === block.id"
          class="p-4 space-y-4"
        >
          <!-- Loading state -->
          <div
            v-if="loading"
            class="flex items-center justify-center py-8"
          >
            <UIcon
              name="i-lucide-loader-2"
              class="animate-spin text-2xl text-gray-400"
            />
          </div>

          <!-- Error state -->
          <div
            v-else-if="error"
            class="p-4 bg-red-50 text-red-600 rounded"
          >
            {{ error }}
          </div>

          <!-- Fields -->
          <template v-else>
            <div
              v-for="[fieldName, fieldDef] in currentFields"
              :key="fieldName"
              class="space-y-1"
            >
              <label
                v-if="fieldDef?.cms?.options?.label"
                class="block text-sm font-medium text-gray-700"
              >
                {{ fieldDef.cms.options.label }}
                <span
                  v-if="fieldDef.required"
                  class="text-red-500 ml-1"
                >*</span>
              </label>

              <p
                v-if="fieldDef?.cms?.options?.description"
                class="text-sm text-gray-500"
              >
                {{ fieldDef.cms.options.description }}
              </p>

              <CmsWidgetRenderer
                :widget="fieldDef?.cms?.widget || 'text'"
                :model-value="block.data[fieldName]"
                :options="fieldDef?.cms?.options || {}"
                @update:model-value="updateBlockField(block.id, fieldName, $event)"
              />
            </div>

            <!-- No fields message -->
            <div
              v-if="currentFields.length === 0"
              class="text-sm text-gray-500 italic py-4 text-center"
            >
              No editable fields found for this block type.
            </div>
          </template>
        </div>
      </div>
      <!-- Drop zone at end of list -->
      <div
        v-if="modelValue.length > 0"
        class="h-4 rounded-lg border-2 border-dashed transition-colors"
        :class="dragOverIndex === modelValue.length ? 'border-primary-500 bg-primary-50' : 'border-transparent'"
        @dragover.prevent="dragOverIndex = modelValue.length"
        @drop.prevent="onDrop($event, modelValue.length)"
      />
    </TransitionGroup>

    <!-- Empty State -->
    <div
      v-if="modelValue.length === 0"
      class="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg"
    >
      <p>No blocks yet. Click "Add Block" to get started.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { BlockItem } from '../types/widgets'
import { useBlockComponents } from '../composables/useBlockComponents'

const toast = useToast()

interface Props {
  modelValue?: BlockItem[]
  allowedBlocks?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: BlockItem[]]
}>()

const selectedId = ref<string | null>(null)

// Drag and drop state
const draggingIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

// Use block components composable
const {
  loading,
  error,
  currentFields,
  loadBlock,

} = useBlockComponents()

// Drag and drop handlers
function onDragStart(event: DragEvent, index: number) {
  draggingIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    // Set a transparent drag image or custom one if desired
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  if (draggingIndex.value === null || draggingIndex.value === index) return
  dragOverIndex.value = index
}

function onDrop(event: DragEvent, index: number) {
  event.preventDefault()
  if (draggingIndex.value === null || draggingIndex.value === index) {
    clearDragState()
    return
  }

  const fromIndex = draggingIndex.value
  const toIndex = index

  const newValue = [...props.modelValue]
  const [movedItem] = newValue.splice(fromIndex, 1)

  if (!movedItem) {
    clearDragState()
    return
  }

  newValue.splice(toIndex, 0, movedItem)

  emit('update:modelValue', newValue)
  clearDragState()
}

function onDragEnd() {
  clearDragState()
}

function clearDragState() {
  draggingIndex.value = null
  dragOverIndex.value = null
}

// Generate UUID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// Available blocks based on allowedBlocks prop
const availableBlocks = computed(() => {
  return props.allowedBlocks || []
})

// Block menu items for dropdown
const blockMenuItems = computed(() => {
  const items = availableBlocks.value.map(blockName => ({
    label: getBlockLabel(blockName),
    icon: getBlockIcon(blockName),
    onSelect: () => addBlock(blockName),
  }))

  // Add separator and paste option
  if (items.length > 0) {
    items.push({
      label: '',
      icon: '',
      onSelect: async () => {},
    })
  }

  items.push({
    label: 'Paste from clipboard',
    icon: 'i-lucide-clipboard-paste',
    onSelect: () => pasteBlock(),
  })

  return items
})

// Get block label (can be enhanced with block metadata)
function getBlockLabel(blockType: string): string {
  // Convert PascalCase to spaced words
  return blockType
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\s/, '')
    .replace(/^./, s => s.toUpperCase())
}

// Get block icon (can be customized per block)
function getBlockIcon(_blockType: string): string {
  // Default icon - can be enhanced to load from block metadata
  return 'i-lucide-square-stack'
}

// Toggle block selection and load its fields
async function toggleBlock(blockId: string) {
  if (selectedId.value === blockId) {
    selectedId.value = null
    return
  }

  selectedId.value = blockId

  // Find the block
  const block = props.modelValue.find(b => b.id === blockId)
  if (block) {
    // Load the block component to get its fields
    await loadBlock(block.type)
  }
}

// Watch for selected block changes to load fields
watch(selectedId, async (newId) => {
  if (newId) {
    const block = props.modelValue.find(b => b.id === newId)
    if (block) {
      await loadBlock(block.type)
    }
  }
})

// Add a new block
async function addBlock(type: string) {
  // Load the block component to get default values
  const blockInfo = await loadBlock(type)

  const newBlock: BlockItem = {
    id: generateId(),
    type,
    data: blockInfo?.defaults || {},
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }

  const newValue = [...props.modelValue, newBlock]
  emit('update:modelValue', newValue)
  selectedId.value = newBlock.id
}

// Remove a block
function removeBlock(index: number) {
  const newValue = props.modelValue.filter((_block, i) => i !== index)
  emit('update:modelValue', newValue)

  // Clear selection if removed block was selected
  if (selectedId.value === props.modelValue[index]?.id) {
    selectedId.value = null
  }
}

// Move a block up or down
function moveBlock(index: number, direction: number) {
  const newValue = [...props.modelValue]
  const targetIndex = index + direction

  if (targetIndex < 0 || targetIndex >= newValue.length) return

  const temp = newValue[index]
  if (!temp) return

  const target = newValue[targetIndex]
  if (!target) return

  newValue[index] = target
  newValue[targetIndex] = temp
  emit('update:modelValue', newValue)
}

// Get context menu items for a block
function getBlockContextMenuItems(index: number) {
  return [
    {
      label: 'Duplicate',
      icon: 'i-lucide-copy',
      onSelect: () => duplicateBlock(index),
    },
    {
      label: 'Copy to clipboard',
      icon: 'i-lucide-clipboard-copy',
      onSelect: () => copyBlock(index),
    },
    {
      label: 'Paste after',
      icon: 'i-lucide-clipboard-paste',
      onSelect: () => pasteBlock(index),
    },
  ]
}

// Duplicate a block
function duplicateBlock(index: number) {
  const block = props.modelValue[index]
  if (!block) return

  const newBlock: BlockItem = {
    ...block,
    id: generateId(),
    data: JSON.parse(JSON.stringify(block.data)),
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }

  const newValue = [...props.modelValue]
  newValue.splice(index + 1, 0, newBlock)
  emit('update:modelValue', newValue)

  toast.add({
    title: 'Block duplicated',
    color: 'success',
    icon: 'i-lucide-check',
  })
}

// Copy block to clipboard
async function copyBlock(index: number) {
  const block = props.modelValue[index]
  if (!block) return

  try {
    await navigator.clipboard.writeText(JSON.stringify(block))
    toast.add({
      title: 'Block copied to clipboard',
      color: 'success',
      icon: 'i-lucide-check',
    })
  }
  catch {
    toast.add({
      title: 'Failed to copy block',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}

// Paste block from clipboard
async function pasteBlock(afterIndex?: number) {
  try {
    const text = await navigator.clipboard.readText()
    const parsed = JSON.parse(text)

    // Validate block data
    if (!parsed || typeof parsed !== 'object' || !parsed.type || !parsed.data) {
      throw new Error('Invalid block data')
    }

    // Check if block type is allowed
    if (props.allowedBlocks && !props.allowedBlocks.includes(parsed.type)) {
      throw new Error(`Block type "${parsed.type}" is not allowed`)
    }

    const newBlock: BlockItem = {
      ...parsed,
      id: generateId(),
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }

    const newValue = [...props.modelValue]
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : newValue.length
    newValue.splice(insertIndex, 0, newBlock)
    emit('update:modelValue', newValue)

    toast.add({
      title: 'Block pasted',
      color: 'success',
      icon: 'i-lucide-check',
    })
  }
  catch {
    toast.add({
      title: 'Clipboard does not contain a valid block',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}

// Update a block field
function updateBlockField(blockId: string, fieldName: string, value: any) {
  const newValue = props.modelValue.map((block) => {
    if (block.id === blockId) {
      return {
        ...block,
        data: { ...block.data, [fieldName]: value },
        meta: {
          createdAt: block.meta?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    }
    return block
  })
  emit('update:modelValue', newValue)
}
</script>

<style scoped>
/* Transitions */
.block-list-move {
  transition: transform 0.3s ease;
}

.block-list-enter-active,
.block-list-leave-active {
  transition: all 0.3s ease;
}

.block-list-enter-from,
.block-list-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
