<template>
  <div>
    <h1>CMS Module Demo</h1>

    <div style="margin: 2rem 0;">
      <h2>Collections</h2>
      <ul>
        <li><a href="/api/cms/products">Products API</a></li>
        <li><a href="/api/cms/pages">Pages API</a></li>
      </ul>
    </div>

    <div v-if="products" style="margin: 2rem 0;">
      <h2>Products</h2>
      <pre>{{ products }}</pre>
    </div>

    <div v-if="pages" style="margin: 2rem 0;">
      <h2>Pages</h2>
      <pre>{{ pages }}</pre>
    </div>

    <div style="margin: 2rem 0;">
      <h2>Create Test Product</h2>
      <button @click="createProduct">Create Test Product</button>
      <pre v-if="newProduct">{{ newProduct }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: products, refresh: refreshProducts } = await useFetch('/api/cms/products')
const { data: pages } = await useFetch('/api/cms/pages')

const newProduct = ref(null)

async function createProduct() {
  try {
    const result = await $fetch('/api/cms/products', {
      method: 'POST',
      body: {
        name: 'Test Product ' + Date.now(),
        slug: 'test-product-' + Date.now(),
        description: 'This is a test product created from the demo page',
        price: 1999,
        active: true,
      },
      headers: {
        'Authorization': 'Bearer admin123',
      },
    })
    newProduct.value = result
    await refreshProducts()
  }
  catch (error: any) {
    console.error('Failed to create product:', error)
    alert('Error: ' + error.message)
  }
}
</script>

<style scoped>
pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

button {
  padding: 0.5rem 1rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #45a049;
}
</style>
