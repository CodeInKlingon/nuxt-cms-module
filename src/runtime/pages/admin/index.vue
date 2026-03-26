<script setup lang="ts">
const config = useRuntimeConfig()
const collections = computed(() => config.public.cms.collections || [])
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')
const title = computed(() => config.public.cms.admin?.title || 'CMS Admin')

definePageMeta({
  layout: 'cms-admin',
})
</script>

<template>
  <UDashboardPanel id="cms-home">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 lg:p-6 space-y-6">
        <div>
          <h2 class="text-xl font-semibold text-highlighted">
            Collections
          </h2>
          <p class="mt-1 text-sm text-muted">
            Manage your content collections
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <NuxtLink
            v-for="collection in collections"
            :key="collection.name"
            :to="`${adminRoute}/${collection.name}`"
            class="group"
          >
            <UCard
              class="h-full transition-shadow hover:shadow-md ring-default hover:ring-primary"
              :ui="{ body: 'p-5' }"
            >
              <div class="flex items-start gap-4">
                <div class="flex items-center justify-center size-10 rounded-lg bg-primary/10 shrink-0">
                  <UIcon
                    :name="collection.options?.icon || 'i-lucide-layers'"
                    class="size-5 text-primary"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-highlighted truncate group-hover:text-primary transition-colors">
                    {{ collection.options?.label || collection.name }}
                  </p>
                  <p v-if="collection.options?.description" class="mt-0.5 text-sm text-muted truncate">
                    {{ collection.options.description }}
                  </p>
                  <p v-else class="mt-0.5 text-sm text-muted">
                    {{ collection.fields.length }} field{{ collection.fields.length === 1 ? '' : 's' }}
                  </p>
                </div>

                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 text-muted shrink-0 mt-0.5 group-hover:text-primary transition-colors"
                />
              </div>
            </UCard>
          </NuxtLink>
        </div>

        <div v-if="!collections.length" class="flex flex-col items-center justify-center py-16 text-center">
          <UIcon name="i-lucide-inbox" class="size-12 text-muted mb-4" />
          <p class="text-base font-medium text-highlighted">
            No collections
          </p>
          <p class="mt-1 text-sm text-muted">
            Define collections in your module configuration to get started.
          </p>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
