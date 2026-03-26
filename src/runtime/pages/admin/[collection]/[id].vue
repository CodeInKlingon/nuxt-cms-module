<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const collectionName = computed(() => route.params.collection as string)
const itemId = computed(() => route.params.id as string)
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')
const toast = useToast()

// Get collection definition
const collection = computed(() => {
  return config.public.cms.collections.find((c: any) => c.name === collectionName.value)
})

const collectionLabel = computed(() => collection.value?.options?.label || collectionName.value)

// Fetch existing item
const { data: item, pending } = await useFetch(`/api/cms/${collectionName.value}/${itemId.value}`)

// Form state
const formData = ref<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

// Initialize form with existing data
watch(item, (newItem) => {
  if (newItem) {
    formData.value = { ...newItem }
  }
}, { immediate: true })

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
    router.push(`${adminRoute.value}/${collectionName.value}`)
  }
  catch (error: any) {
    if (error.data?.errors) {
      for (const err of error.data.errors) {
        errors.value[err.field] = err.message
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
        <div v-if="pending" class="flex items-center justify-center py-16">
          <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
        </div>

        <UCard v-else>
          <form class="space-y-5" @submit.prevent="submit">
            <template v-for="field in collection?.fields" :key="field.name">
              <!-- Text field -->
              <UFormGroup
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
              </UFormGroup>

              <!-- Textarea field -->
              <UFormGroup
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
              </UFormGroup>

              <!-- Number field -->
              <UFormGroup
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
              </UFormGroup>

              <!-- Boolean field -->
              <UFormGroup
                v-else-if="field.type === 'boolean'"
                :label="field.label || field.name"
                :error="errors[field.name]"
                :help="field.description"
              >
                <UToggle v-model="formData[field.name]" />
              </UFormGroup>

              <!-- Date field -->
              <UFormGroup
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
              </UFormGroup>

              <!-- Datetime field -->
              <UFormGroup
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
              </UFormGroup>

              <!-- Select field -->
              <UFormGroup
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
              </UFormGroup>
            </template>

            <div class="flex items-center gap-3 pt-4 border-t border-default">
              <UButton
                type="submit"
                :loading="submitting"
                icon="i-lucide-save"
              >
                Save Changes
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
