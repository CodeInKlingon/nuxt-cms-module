<template>
    <pre>{{ page?.blocks }}</pre>
    <RenderBlocks  v-if="page && page.blocks" :blocks="page.blocks" />
</template>
<script setup lang="ts">

const route = useRoute()
const pageSlug = computed(() => {
  return route.params.pageSlug || 'home'
})
const { data: page } = useFetch(`/api/page/${pageSlug.value}`, {
    watch: [pageSlug],
})
</script>
