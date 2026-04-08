import { defineEventHandler } from 'h3'

// Try to get clearUserSession from Nitro auto-imports or fallback to direct import
// @ts-ignore - Provided by nuxt-auth-utils module
const _clearUserSession = typeof clearUserSession !== 'undefined' ? clearUserSession : async (...args: any[]) => {
  // Fallback: dynamically import if auto-import isn't available
  // @ts-ignore - Internal path not exported but exists at runtime
  const utils = await import('nuxt-auth-utils/dist/runtime/server/utils/session.js')
  return utils.clearUserSession(...args)
}

export default defineEventHandler(async (event) => {
  await _clearUserSession(event)
  return { ok: true }
})
