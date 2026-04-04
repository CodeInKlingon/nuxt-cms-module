<script setup lang="ts">
import type { CollectionDefinition, FormFieldConfig, FormSection, FormTab } from '../../../types'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const collectionName = computed(() => route.params.collection as string)
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

// Derive layout from dashboard.form
const hasTabs = computed(() => (collection.value?.dashboard?.form?.tabs?.length ?? 0) > 0)

const tabs = computed<FormTab[]>(() => collection.value?.dashboard?.form?.tabs ?? [])

const flatSections = computed<FormSection[]>(() =>
  collection.value?.dashboard?.form?.sections ?? [],
)

// Active tab index
const activeTab = ref(0)

// Form state — drizzle record values are genuinely unknown at the page level
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formData = ref<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

// Initialize form with default values whenever the collection changes
watch(collection, (col) => {
  if (!col) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialData: Record<string, any> = {}

  const processField = (f: FormFieldConfig) => {
    if (f.defaultValue !== undefined) {
      initialData[f.field] = f.defaultValue
    }
  }

  const form = col.dashboard?.form
  if (form?.tabs) {
    for (const tab of form.tabs) {
      for (const section of tab.sections) {
        section.fields.forEach(processField)
      }
    }
  }
  else {
    for (const section of form?.sections ?? []) {
      section.fields.forEach(processField)
    }
  }

  formData.value = initialData
  errors.value = {}
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
    await $fetch(`/api/cms/${collectionName.value}`, {
      method: 'POST',
      body: formData.value,
    })

    toast.add({ title: `${collectionLabel.value} created`, color: 'success', icon: 'i-lucide-check-circle' })
    router.push(`${adminRoute.value}/${collectionName.value}`)
  }
  catch (err) {
    const error = err as { data?: { errors?: Array<{ field: string, message: string }> } }
    if (error.data?.errors) {
      for (const e of error.data.errors) {
        errors.value[e.field] = e.message
      }
    }
    else {
      toast.add({ title: 'Failed to create item', color: 'error', icon: 'i-lucide-x-circle' })
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
  <UDashboardPanel :id="`cms-${collectionName}-create`">
    <template #header>
      <UDashboardNavbar :title="`New ${collectionLabel}`">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            :to="`${adminRoute}/${collectionName}`"
            size="sm"
          >
            Back
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-3xl mx-auto p-4 lg:p-6">
        <form @submit.prevent="submit">
          <!-- Tabbed layout -->
          <template v-if="hasTabs">
            <UTabs
              v-model="activeTab"
              :items="tabs.map((t, i) => ({ label: t.label, icon: t.icon, slot: `tab-${i}` }))"
              class="mb-6"
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

          <div class="flex items-center gap-3 pt-6 border-t border-default mt-6">
            <UButton
              type="submit"
              :loading="submitting"
              icon="i-lucide-plus"
            >
              Create
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              :to="`${adminRoute}/${collectionName}`"
            >
              Cancel
            </UButton>
          </div>
        </form>
      </div>
    </template>
  </UDashboardPanel>
</template>
