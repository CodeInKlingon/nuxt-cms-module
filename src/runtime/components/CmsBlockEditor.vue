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
        :class="{ 'ring-2 ring-primary-500': selectedId === block.id }"
      >
        <!-- Block Header -->
        <div
          class="flex items-center justify-between p-3 bg-gray-50 border-b cursor-pointer"
          @click="toggleBlock(block.id)"
        >
          <div class="flex items-center gap-2">
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

interface Props {
  modelValue: BlockItem[]
  allowedBlocks?: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: BlockItem[]]
}>()

const selectedId = ref<string | null>(null)

// Use block components composable
const {
  loading,
  error,
  currentFields,
  loadBlock,
  getBlockDefaults,
} = useBlockComponents()

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
  return availableBlocks.value.map((blockName) => ({
    label: getBlockLabel(blockName),
    icon: getBlockIcon(blockName),
    onSelect: () => addBlock(blockName),
  }))
})

// Get block label (can be enhanced with block metadata)
function getBlockLabel(blockType: string): string {
  // Convert PascalCase to spaced words
  return blockType
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\s/, '')
    .replace(/^./, (s) => s.toUpperCase())
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
  const block = props.modelValue.find((b) => b.id === blockId)
  if (block) {
    // Load the block component to get its fields
    await loadBlock(block.type)
  }
}

// Watch for selected block changes to load fields
watch(selectedId, async (newId) => {
  if (newId) {
    const block = props.modelValue.find((b) => b.id === newId)
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
  const newValue = props.modelValue.filter((_, i) => i !== index)
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
