import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getCollectionDefinition } from '../utils/drizzle-adapter'

// Try to get requireUserSession from Nitro auto-imports or fallback to direct import
// @ts-ignore - Provided by nuxt-auth-utils module
const _requireUserSession = typeof requireUserSession !== 'undefined' ? requireUserSession : async (...args: any[]) => {
  // Fallback: dynamically import if auto-import isn't available
  // @ts-ignore - Internal path not exported but exists at runtime
  const utils = await import('nuxt-auth-utils/dist/runtime/server/utils/session.js')
  return utils.requireUserSession(...args)
}

/**
 * Auth middleware for CMS API routes.
 * - Skips auth for /auth/** endpoints (login, logout)
 * - Skips auth for GET requests to collections with options.public === true
 * - Skips auth entirely if no password is configured
 * - Otherwise requires a valid nuxt-auth-utils session
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event) as any
  const path = event.path
  const apiPrefix = config.public?.cms?.api?.prefix || '/api/cms'

  // Only apply to CMS API routes
  if (!path.startsWith(apiPrefix)) return

  // Never gate the auth endpoints themselves
  if (path.startsWith(`${apiPrefix}/auth/`)) return

  // Skip auth entirely if no password is configured (dev convenience)
  if (!config.cms?.admin?.password) return

  // Allow unauthenticated GET reads for public collections
  if (event.method === 'GET') {
    const pathAfterPrefix = path.replace(apiPrefix, '').split('?')[0] || ''
    const collectionName = pathAfterPrefix.split('/').filter(Boolean)[0]
    if (collectionName) {
      const collection = getCollectionDefinition(collectionName)
      if (collection?.options?.public === true) return
    }
  }

  // Enforce valid session — throws 401 if missing or invalid
  await _requireUserSession(event)
})
