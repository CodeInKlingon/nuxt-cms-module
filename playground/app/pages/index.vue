<template>
  <div>
    <h1>CMS Module Demo</h1>

    <div v-if="products" style="margin: 2rem 0;">
      <h2>Products</h2>
      <pre>{{ products }}</pre>
    </div>

    <div v-if="pages" style="margin: 2rem 0;">
      <h2>Pages</h2>
      <pre>{{ pages }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: products } = await useFetch('/api/products')
const { data: pages } = await useFetch('/api/pages')
</script>

<style scoped>
pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
