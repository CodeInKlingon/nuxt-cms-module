<script setup lang="ts">
import type { FormSection } from '../../types'

defineProps<{
  section: FormSection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData: Record<string, any>
  errors: Record<string, string>
}>()

const emit = defineEmits<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'update:formData': [field: string, value: any]
}>()
</script>

<template>
  <UCard>
    <template
      v-if="section.label || section.description"
      #header
    >
      <div>
        <p
          v-if="section.label"
          class="font-medium text-highlighted"
        >
          {{ section.label }}
        </p>
        <p
          v-if="section.description"
          class="text-sm text-muted mt-0.5"
        >
          {{ section.description }}
        </p>
      </div>
    </template>

    <div class="space-y-5">
      <CmsFieldWidget
        v-for="fieldConfig in section.fields"
        :key="fieldConfig.field"
        :field="fieldConfig"
        :model-value="formData[fieldConfig.field]"
        :error="errors[fieldConfig.field]"
        @update:model-value="emit('update:formData', fieldConfig.field, $event)"
      />
    </div>
  </UCard>
</template>
