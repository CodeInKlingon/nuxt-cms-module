<script setup lang="ts">
import { resolveComponent } from 'vue'

const props = defineProps<{
  pageName: string
  adminRoute: string
  apiPrefix: string
}>()

const config = useRuntimeConfig()

const page = computed(() =>
  config.public.cms.customPages?.find((p: { name: string }) => p.name === props.pageName),
)

const pageComponent = computed(() => {
  if (!page.value?.componentName) return null
  return resolveComponent(page.value.componentName)
})
</script>

<template>
  <component
    :is="pageComponent"
    v-if="pageComponent"
    :page-name="pageName"
    :admin-route="adminRoute"
    :api-prefix="apiPrefix"
  />
  <div
    v-else
    class="p-4 text-red-600"
  >
    Custom page "{{ pageName }}" not found
  </div>
</template>
