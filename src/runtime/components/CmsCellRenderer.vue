<script setup lang="ts">
import type { CellConfig } from '../types'
import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatCurrency,
  formatNumber,
  resolveMapped,
  substituteTemplate,
} from '../utils/cell-formatting'

const props = defineProps<{
  config?: CellConfig
  value: unknown
  row?: Record<string, unknown>
}>()

function handleCopy() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(String(props.value ?? ''))
  }
}

const displayText = computed(() => {
  const val = props.value
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  return String(val)
})

function getTruncate(config: CellConfig | undefined): number | undefined {
  if (!config) return undefined
  if (config.type === 'text' || config.type === 'link' || config.type === 'copy') {
    return config.truncate
  }
  return undefined
}

const shouldTruncate = computed(() => {
  const truncate = getTruncate(props.config)
  return typeof truncate === 'number' && typeof props.value === 'string' && props.value.length > truncate
})

const truncatedText = computed(() => {
  if (!shouldTruncate.value) return displayText.value
  const truncate = getTruncate(props.config)!
  return `${displayText.value.slice(0, truncate)}...`
})
</script>

<template>
  <span
    v-if="!config || config.type === 'text'"
    :class="config?.class"
    :title="shouldTruncate ? displayText : undefined"
  >
    {{ truncatedText }}
  </span>

  <UBadge
    v-else-if="config && config.type === 'badge'"
    :label="resolveMapped(value, config.label)"
    :color="resolveMapped(value, config.color, 'neutral') as any"
    :variant="config.variant as any"
    :size="config.size as any"
    :class="config.class"
  />

  <div
    v-else-if="config && config.type === 'boolean'"
    class="flex items-center gap-1.5"
    :class="config.class"
  >
    <UIcon
      :name="value ? (config.trueIcon || 'i-lucide-check-circle') : (config.falseIcon || 'i-lucide-x-circle')"
      class="size-4"
      :class="value ? 'text-green-500' : 'text-red-500'"
    />
    <span v-if="config.showLabel">
      {{ value ? 'Yes' : 'No' }}
    </span>
  </div>

  <span
    v-else-if="config && config.type === 'date'"
    :class="config.class"
  >
    {{ formatDate(value, config.format) }}
  </span>

  <span
    v-else-if="config && config.type === 'datetime'"
    :class="config.class"
  >
    {{ formatDateTime(value, config.format) }}
  </span>

  <span
    v-else-if="config && config.type === 'relative'"
    :class="config.class"
  >
    {{ formatRelative(value) }}
  </span>

  <div
    v-else-if="config && config.type === 'avatar'"
    class="flex items-center gap-2"
    :class="config.class"
  >
    <UAvatar
      :src="config.srcField && row ? String(row[config.srcField] ?? '') : undefined"
      :text="config.fallback && (!config.srcField || !row?.[config.srcField]) ? config.fallback : undefined"
      :size="config.size || 'sm'"
    />
    <span v-if="config.showName && config.nameField && row">
      {{ String(row[config.nameField] ?? '') }}
    </span>
  </div>

  <ULink
    v-else-if="config && config.type === 'link'"
    :to="typeof config.href === 'function' && row ? config.href(row) : typeof config.href === 'string' && row ? substituteTemplate(config.href, row) : String(value ?? '')"
    :target="config.target"
    :external="config.external"
    :class="config.class"
  >
    {{ truncatedText }}
  </ULink>

  <span
    v-else-if="config && config.type === 'currency'"
    :class="config.class"
  >
    {{ formatCurrency(value, config.currency, config.locale) }}
  </span>

  <span
    v-else-if="config && config.type === 'number'"
    :class="config.class"
  >
    {{ formatNumber(value, config.decimals, config.locale, config.prefix, config.suffix) }}
  </span>

  <img
    v-else-if="config && config.type === 'image'"
    :src="String(value ?? '')"
    alt=""
    :width="config.width"
    :height="config.height"
    :class="['object-cover', config.rounded !== false ? 'rounded-md' : '', config.class]"
  >

  <div
    v-else-if="config && config.type === 'copy'"
    class="flex items-center gap-1.5 group"
    :class="config.class"
  >
    <span :title="shouldTruncate ? displayText : undefined">
      {{ truncatedText }}
    </span>
    <UButton
      icon="i-lucide-copy"
      variant="ghost"
      size="xs"
      color="neutral"
      class="opacity-0 group-hover:opacity-100 transition-opacity"
      @click="handleCopy"
    />
  </div>

  <span v-else>
    {{ displayText }}
  </span>
</template>
