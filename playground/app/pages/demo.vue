<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <div v-if="pending" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl" />
      <p class="mt-4 text-gray-500">Loading page...</p>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-lucide-alert-circle" class="text-3xl text-red-500" />
      <p class="mt-4 text-red-600">Error loading page</p>
    </div>

    <article v-else-if="page" class="space-y-8">
      <header class="border-b pb-8">
        <h1 class="text-4xl font-bold">{{ page.title }}</h1>
        <p class="mt-2 text-gray-500">
          Slug: {{ page.slug }} | 
          Status: {{ page.published ? 'Published' : 'Draft' }}
        </p>
      </header>

      <!-- Legacy content (if any) -->
      <div v-if="page.content" class="prose max-w-none">
        <h2 class="text-lg font-semibold text-gray-400 mb-2">Legacy Content</h2>
        <p class="whitespace-pre-wrap">{{ page.content }}</p>
      </div>

      <!-- Block content -->
      <div v-if="page.blocks && page.blocks.length > 0">
        <h2 class="text-lg font-semibold text-gray-400 mb-4">Block Content</h2>
        <RenderBlocks :blocks="page.blocks" />
      </div>

      <div v-else class="text-center py-12 text-gray-400">
        <p>No content blocks yet.</p>
        <UButton 
          to="/admin/pages" 
          class="mt-4"
          color="primary"
        >
          Edit in Admin
        </UButton>
      </div>
    </article>

    <div v-else class="text-center py-12 text-gray-500">
      <p>Page not found</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Fetch the first page as a demo
const { data: pages, pending, error } = await useFetch('/api/cms/pages?limit=1')

const page = computed(() => {
  if (pages.value && Array.isArray(pages.value) && pages.value.length > 0) {
    return pages.value[0]
  }
  return null
})
</script>
