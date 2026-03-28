<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
const appConfig = useAppConfig()
appConfig.ui.colors.neutral = "slate";
appConfig.ui.colors.primary = "sky";
console.log('appConfig', appConfig.ui.colors)
const config = useRuntimeConfig()

const collections = computed(() => config.public.cms.collections || [])
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')
const title = computed(() => config.public.cms.admin?.title || 'CMS Admin')

const open = ref(false)

const navLinks = computed<NavigationMenuItem[][]>(() => {
  const collectionItems: NavigationMenuItem[] = collections.value.map((c: { name: string, options?: { label?: string, icon?: string } }) => ({
    label: c.options?.label || c.name,
    icon: c.options?.icon || 'i-lucide-layers',
    to: `${adminRoute.value}/${c.name}`,
    onSelect: () => {
      open.value = false
    },
  }))

  return [
    [
      {
        label: 'Dashboard',
        icon: 'i-lucide-layout-dashboard',
        to: adminRoute.value,
        exact: true,
        onSelect: () => {
          open.value = false
        },
      },
      ...collectionItems,
    ],
  ]
})

const { clear: clearSession } = useUserSession()

const logout = async () => {
  await $fetch('/api/cms/auth/logout', { method: 'POST' }).catch(() => {})
  await clearSession()
  navigateTo(`${adminRoute.value}/login`)
}
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />
    <UTheme
      :ui="{
        primary: 'blue',
        secondary: 'purple',
        neutral: 'zinc',
      }"
    >
      <UDashboardGroup unit="rem">
        <UDashboardSidebar
          id="cms-sidebar"
          v-model:open="open"
          collapsible
          resizable
          class="bg-elevated/25"
          :ui="{ footer: 'lg:border-t lg:border-default' }"
        >
          <template #header="{ collapsed }">
            <UButton
              color="neutral"
              variant="ghost"
              block
              :square="collapsed"
              :label="collapsed ? undefined : title"
              icon="i-lucide-layout-dashboard"
              :to="adminRoute"
              class="data-[state=open]:bg-elevated font-semibold"
              :class="[!collapsed && 'py-2']"
            />
          </template>

          <template #default="{ collapsed }">
            <UNavigationMenu
              :collapsed="collapsed"
              :items="navLinks[0]"
              orientation="vertical"
              tooltip
            />
          </template>

          <template #footer="{ collapsed }">
            <UButton
              color="neutral"
              variant="ghost"
              block
              :square="collapsed"
              :label="collapsed ? undefined : 'Log out'"
              icon="i-lucide-log-out"
              :class="[!collapsed && 'py-2']"
              :ui="{ trailingIcon: 'text-dimmed' }"
              @click="logout"
            />
          </template>
        </UDashboardSidebar>

        <slot />
      </UDashboardGroup>
    </UTheme>
  </UApp>
</template>

<style>
@import 'tailwindcss';
@import "@nuxt/ui";
</style>
