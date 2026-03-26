<script setup lang="ts">
const config = useRuntimeConfig()
const router = useRouter()
const { fetch: refreshSession } = useUserSession()
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')
const title = computed(() => config.public.cms.admin?.title || 'CMS Admin')

const password = ref('')
const error = ref('')
const loading = ref(false)

const login = async () => {
  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/cms/auth/login', {
      method: 'POST',
      body: { password: password.value },
    })

    await refreshSession()
    router.push(adminRoute.value)
  }
  catch {
    error.value = 'Invalid password. Please try again.'
  }
  finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'cms-admin',
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-default p-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <div class="inline-flex items-center justify-center size-12 rounded-xl bg-primary/10 mb-4">
          <UIcon name="i-lucide-layout-dashboard" class="size-6 text-primary" />
        </div>
        <h1 class="text-2xl font-bold text-highlighted">
          {{ title }}
        </h1>
        <p class="mt-1.5 text-sm text-muted">
          Sign in to access the admin panel
        </p>
      </div>

      <UCard>
        <form class="space-y-4" @submit.prevent="login">
          <UFormField
            label="Password"
            :error="error"
          >
            <UInput
              v-model="password"
              type="password"
              placeholder="Enter admin password"
              size="lg"
              autofocus
              icon="i-lucide-lock"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            size="lg"
            :loading="loading"
            icon="i-lucide-log-in"
          >
            Sign In
          </UButton>
        </form>
      </UCard>
    </div>
  </div>
</template>
