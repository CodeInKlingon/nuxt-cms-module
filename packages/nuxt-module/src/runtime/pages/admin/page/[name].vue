<script setup lang="ts">
import { computed } from 'vue'
import type { CustomPageDefinition } from '../../../types'

const route = useRoute()
const config = useRuntimeConfig()
const pageName = computed(() => route.params.name as string)

const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')
const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')

const pageMeta = computed<Pick<CustomPageDefinition, 'name' | 'label' | 'icon'> | undefined>(() =>
  config.public.cms.customPages?.find((p: { name: string }) => p.name === pageName.value),
)

const pageTitle = computed(() => {
  const baseTitle = config.public.cms.admin?.title || 'CMS Admin'
  return pageMeta.value ? `${baseTitle} | ${pageMeta.value.label}` : baseTitle
})

useHead(() => ({
  title: pageTitle.value,
}))

definePageMeta({
  layout: 'cms-admin',
})
</script>

<template>
  <UDashboardPanel :id="`cms-page-${pageName}`">
    <template #header>
      <UDashboardNavbar :title="pageMeta?.label || pageName">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <CmsCustomPageLoader
        :page-name="pageName"
        :admin-route="adminRoute"
        :api-prefix="apiPrefix"
      />
    </template>
  </UDashboardPanel>
</template>
