<script setup lang="ts">
import type { CollectionDefinition, FormSection, FormTab } from '../../../types'
import type { BlockItem } from '../../../types/widgets'

const route = useRoute()
const config = useRuntimeConfig()
const collectionName = computed(() => route.params.collection as string)
const itemId = computed(() => route.params.id as string)
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')
const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')
const toast = useToast()

// Fetch the full collections list once; derive active collection synchronously
const { data: allCollections } = await useFetch<CollectionDefinition[]>(
  () => `${apiPrefix.value}/collections`,
  { default: (): CollectionDefinition[] => [] },
)

const collection = computed(() =>
  allCollections.value.find((c: CollectionDefinition) => c.name === collectionName.value) ?? null,
)

const collectionLabel = computed(() => collection.value?.options?.label || collectionName.value)

const pageTitle = computed(() => {
  const baseTitle = config.public.cms.admin?.title || 'CMS Admin'
  return `${baseTitle} | ${collectionLabel.value} | Edit`
})

useHead(() => ({
  title: pageTitle.value,
}))

// Fetch existing item
const { data: item, pending } = await useFetch(
  () => `/api/cms/${collectionName.value}/${itemId.value}`,
)

// Derive layout from dashboard.form
const hasTabs = computed(() => (collection.value?.dashboard?.form?.tabs?.length ?? 0) > 0)

const tabs = computed<FormTab[]>(() => collection.value?.dashboard?.form?.tabs ?? [])

const flatSections = computed<FormSection[]>(() =>
  collection.value?.dashboard?.form?.sections ?? [],
)

// Check if blocks are enabled for this collection
const hasBlocks = computed(() => collection.value?.blocks?.enabled === true)
const blocksFieldName = computed(() => collection.value?.blocks?.fieldName || 'blocks')
const blocksData = computed(() => formData.value[blocksFieldName.value] as BlockItem[] || [])

// Active tab index - must be string for UTabs v-model
const activeTab = ref('0')

// Form state — eslint-disable-next-line used because drizzle record values are genuinely unknown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formData = ref<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

// Initialize form with existing item data
watch(item, (newItem) => {
  if (newItem) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData.value = { ...(newItem as Record<string, any>) }
  }
}, { immediate: true })

// Handle field update emitted from CmsFormSection
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onFieldUpdate = (field: string, value: any) => {
  formData.value = { ...formData.value, [field]: value }
}

// Submit form
const submit = async () => {
  submitting.value = true
  errors.value = {}

  try {
    await $fetch(`/api/cms/${collectionName.value}/${itemId.value}`, {
      method: 'PUT',
      body: formData.value,
    })

    toast.add({ title: 'Changes saved', color: 'success', icon: 'i-lucide-check-circle' })
  }
  catch (err) {
    const error = err as { data?: { errors?: Array<{ field: string, message: string }> } }
    if (error.data?.errors) {
      for (const e of error.data.errors) {
        errors.value[e.field] = e.message
      }
    }
    else {
      toast.add({ title: 'Failed to save changes', color: 'error', icon: 'i-lucide-x-circle' })
    }
  }
  finally {
    submitting.value = false
  }
}

definePageMeta({
  layout: 'cms-admin',
})
</script>

<template>
  <UDashboardPanel :id="`cms-${collectionName}-edit`">
    <template #header>
      <UDashboardNavbar :title="`Edit ${collectionLabel}`">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            color="neutral"
            variant="ghost"
            :to="`${adminRoute}/${collectionName}`"
            size="sm"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            :loading="submitting"
            size="sm"
            icon="i-lucide-save"
            @click="submit"
          >
            Save Changes
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading State -->
      <div
        v-if="pending"
        class="flex items-center justify-center py-16"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin text-muted"
        />
      </div>

      <!-- Split-pane layout for blocks-enabled collections -->
      <div
        v-else-if="hasBlocks"
        class="flex flex-col lg:flex-row gap-6 p-4 lg:p-6"
      >
        <!-- Left: Form -->
        <div class="w-full lg:w-1/2">
          <form @submit.prevent="submit">
            <!-- Tabbed layout -->
            <template v-if="hasTabs">
              <UTabs
                v-model="activeTab"
                :items="tabs.map((t, i) => ({ label: t.label, icon: t.icon, slot: `tab-${i}` }))"
                class="mb-6"
                :unmount-on-hide="false"
              >
                <template
                  v-for="(tab, tabIndex) in tabs"
                  :key="tabIndex"
                  #[`tab-${tabIndex}`]
                >
                  <div class="space-y-6 pt-4">
                    <CmsFormSection
                      v-for="(section, sectionIndex) in tab.sections"
                      :key="sectionIndex"
                      :section="section"
                      :form-data="formData"
                      :errors="errors"
                      @update:form-data="onFieldUpdate"
                    />
                  </div>
                </template>
              </UTabs>
            </template>

            <!-- Flat sections layout -->
            <template v-else>
              <div class="space-y-6">
                <CmsFormSection
                  v-for="(section, sectionIndex) in flatSections"
                  :key="sectionIndex"
                  :section="section"
                  :form-data="formData"
                  :errors="errors"
                  @update:form-data="onFieldUpdate"
                />

                <!-- Fallback: no dashboard config at all -->
                <UCard v-if="flatSections.length === 0">
                  <p class="text-sm text-muted text-center py-4">
                    No form layout configured. Add a <code>dashboard.form</code> to your collection definition.
                  </p>
                </UCard>
              </div>
            </template>
          </form>
        </div>

        <!-- Right: Preview -->
        <div class="w-full lg:w-1/2 lg:sticky lg:top-4 lg:self-start">
          <CmsBlocksPreview :blocks="blocksData" />
        </div>
      </div>

      <!-- Standard centered layout for non-blocks collections -->
      <div
        v-else
        class="w-full max-w-3xl p-4 lg:p-6"
      >
        <form @submit.prevent="submit">
          <!-- Tabbed layout -->
          <template v-if="hasTabs">
            <UTabs
              v-model="activeTab"
              :items="tabs.map((t, i) => ({ label: t.label, icon: t.icon, slot: `tab-${i}` }))"
              class="mb-6"
              :unmount-on-hide="false"
            >
              <template
                v-for="(tab, tabIndex) in tabs"
                :key="tabIndex"
                #[`tab-${tabIndex}`]
              >
                <div class="space-y-6 pt-4">
                  <CmsFormSection
                    v-for="(section, sectionIndex) in tab.sections"
                    :key="sectionIndex"
                    :section="section"
                    :form-data="formData"
                    :errors="errors"
                    @update:form-data="onFieldUpdate"
                  />
                </div>
              </template>
            </UTabs>
          </template>

          <!-- Flat sections layout -->
          <template v-else>
            <div class="space-y-6">
              <CmsFormSection
                v-for="(section, sectionIndex) in flatSections"
                :key="sectionIndex"
                :section="section"
                :form-data="formData"
                :errors="errors"
                @update:form-data="onFieldUpdate"
              />

              <!-- Fallback: no dashboard config at all -->
              <UCard v-if="flatSections.length === 0">
                <p class="text-sm text-muted text-center py-4">
                  No form layout configured. Add a <code>dashboard.form</code> to your collection definition.
                </p>
              </UCard>
            </div>
          </template>
        </form>
      </div>
    </template>
  </UDashboardPanel>
</template>
