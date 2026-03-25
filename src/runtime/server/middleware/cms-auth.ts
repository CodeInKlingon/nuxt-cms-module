import type { H3Event } from 'h3'
import { defineEventHandler, getCookie, setCookie, getHeader, createError } from 'h3'
import { useRuntimeConfig } from '#imports'

const SESSION_COOKIE = 'cms-session'

/**
 * Check if the request is authenticated
 */
export async function checkAuth(event: H3Event): Promise<boolean> {
  const config = useRuntimeConfig() as any

  // Skip if no password configured
  if (!config.cms?.admin?.password) {
    return true
  }

  // Check session cookie
  const session = getCookie(event, SESSION_COOKIE)
  if (session === config.cms.admin.password) {
    return true
  }

  // Check authorization header
  const auth = getHeader(event, 'authorization')
  if (auth === `Bearer ${config.cms.admin.password}`) {
    // Set session cookie
    setCookie(event, SESSION_COOKIE, config.cms.admin.password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    return true
  }

  throw createError({
    statusCode: 401,
    message: 'Unauthorized',
  })
}

/**
 * Auth middleware for CMS routes
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig() as any
  const path = event.path

  // Apply to admin routes and API
  if (
    path.startsWith(config.public?.cms?.admin?.route || '/admin')
    || path.startsWith(config.public?.cms?.api?.prefix || '/api/cms')
  ) {
    await checkAuth(event)
  }
})
