<script setup lang="ts">
const appConfig = useAppConfig()
appConfig.ui.colors.neutral = 'zinc'
appConfig.ui.colors.primary = 'sky'
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />
    <slot />
  </UApp>
</template>
