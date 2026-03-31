<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const collectionName = computed(() => route.params.collection as string)
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')
const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')
const toast = useToast()

// Fetch the full collections list once; derive active collection synchronously
const { data: allCollections } = await useFetch(
  () => `${apiPrefix.value}/collections`,
  { default: () => [] },
)

const collection = computed(() =>
  (allCollections.value as any[]).find((c: any) => c.name === collectionName.value) ?? null,
)

const collectionLabel = computed(() => collection.value?.options?.label || collectionName.value)

// Form state
const formData = ref<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

// Initialize form with default values whenever the collection changes
watch(collection, (col) => {
  if (!col) return
  const initialData: Record<string, any> = {}
  for (const field of col.fields) {
    if (field.defaultValue !== undefined) {
      initialData[field.name] = field.defaultValue
    }
  }
  formData.value = initialData
  errors.value = {}
}, { immediate: true })

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
  catch (error: any) {
    if (error.data?.errors) {
      for (const err of error.data.errors) {
        errors.value[err.field] = err.message
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
      <div class="max-w-2xl mx-auto p-4 lg:p-6">
        <UCard>
          <form class="space-y-5" @submit.prevent="submit">
            <template v-for="field in collection?.fields" :key="field.name">
              <!-- Text field -->
              <UFormField
                v-if="field.type === 'text'"
                :label="field.label || field.name"
                :required="field.required"
                :error="errors[field.name]"
                :help="field.description"
              >
                <UInput
                  v-model="formData[field.name]"
                  :placeholder="field.label || field.name"
                />
              </UFormField>

              <!-- Textarea field -->
              <UFormField
                v-else-if="field.type === 'textarea'"
                :label="field.label || field.name"
                :required="field.required"
                :error="errors[field.name]"
                :help="field.description"
              >
                <UTextarea
                  v-model="formData[field.name]"
                  :placeholder="field.label || field.name"
                  :rows="5"
                />
              </UFormField>

              <!-- Number field -->
              <UFormField
                v-else-if="field.type === 'number'"
                :label="field.label || field.name"
                :required="field.required"
                :error="errors[field.name]"
                :help="field.description"
              >
                <UInput
                  v-model.number="formData[field.name]"
                  type="number"
                  :placeholder="field.label || field.name"
                />
              </UFormField>

              <!-- Boolean field -->
              <UFormField
                v-else-if="field.type === 'boolean'"
                :label="field.label || field.name"
                :error="errors[field.name]"
                :help="field.description"
              >
                <UToggle v-model="formData[field.name]" />
              </UFormField>

              <!-- Date field -->
              <UFormField
                v-else-if="field.type === 'date'"
                :label="field.label || field.name"
                :required="field.required"
                :error="errors[field.name]"
                :help="field.description"
              >
                <UInput
                  v-model="formData[field.name]"
                  type="date"
                />
              </UFormField>

              <!-- Datetime field -->
              <UFormField
                v-else-if="field.type === 'datetime'"
                :label="field.label || field.name"
                :required="field.required"
                :error="errors[field.name]"
                :help="field.description"
              >
                <UInput
                  v-model="formData[field.name]"
                  type="datetime-local"
                />
              </UFormField>

              <!-- Select field -->
              <UFormField
                v-else-if="field.type === 'select'"
                :label="field.label || field.name"
                :required="field.required"
                :error="errors[field.name]"
                :help="field.description"
              >
                <USelect
                  v-model="formData[field.name]"
                  :options="field.widget?.options || []"
                  :placeholder="'Select ' + (field.label || field.name)"
                />
              </UFormField>
            </template>

            <div class="flex items-center gap-3 pt-4 border-t border-default">
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
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
