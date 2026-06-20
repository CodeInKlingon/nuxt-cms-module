import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig, useUserSession } from '#imports'

/**
 * Client-side route guard for admin pages.
 * Redirects unauthenticated users to the login page.
 */
export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  const adminRoute = config.public.cms?.admin?.route || '/admin'
  const loginPath = `${adminRoute}/login`

  // Only apply to admin routes
  if (!to.path.startsWith(adminRoute)) return

  // Never redirect the login page itself
  if (to.path === loginPath) return

  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo(loginPath)
  }
})
