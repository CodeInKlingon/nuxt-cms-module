<script setup lang="ts">
import { ref } from 'vue'

const config = useRuntimeConfig()
const router = useRouter()
const { fetch: refreshSession } = useUserSession()
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')

const password = ref('')
const loading = ref(false)
const error = ref('')

const login = async () => {
  console.log
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
    error.value = 'Invalid credentials. Please try again.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <form
    class="space-y-4"
    @submit.prevent="login"
  >
    <UFormField
      label="Select password"
      :error="error"
    >
          <URadioGroup
            v-model="password"
            :items="[
              'password',
              'incorrect'
            ]"
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
</template>
