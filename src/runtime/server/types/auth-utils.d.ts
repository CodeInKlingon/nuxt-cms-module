/**
 * Type stubs for nuxt-auth-utils Nitro auto-imports.
 * These functions are injected by nuxt-auth-utils via addServerImportsDir
 * and are globally available in Nitro server context at runtime.
 * The explicit imports are intentionally omitted to avoid bundling issues
 * when #auth-utils resolves to the type-only stub during builds.
 */
import type { H3Event } from 'h3'

interface UserSession {
  user?: Record<string, unknown>
  [key: string]: unknown
}

interface UserSessionRequired extends UserSession {
  user: Record<string, unknown>
}

declare global {
  function getUserSession(event: H3Event): Promise<UserSession>
  function setUserSession(event: H3Event, data: Omit<UserSession, 'id'>): Promise<UserSession>
  function replaceUserSession(event: H3Event, data: Omit<UserSession, 'id'>): Promise<UserSession>
  function clearUserSession(event: H3Event): Promise<boolean>
  function requireUserSession(event: H3Event, opts?: { statusCode?: number, message?: string }): Promise<UserSessionRequired>
}

export {}
