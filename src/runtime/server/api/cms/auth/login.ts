import { defineEventHandler, readBody, createError } from 'h3'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event) as any

  const adminPassword = config.cms?.admin?.password
  if (!adminPassword) {
    throw createError({ statusCode: 503, message: 'Auth not configured' })
  }

  const { password } = await readBody(event)
  if (!password) {
    throw createError({ statusCode: 400, message: 'Password required' })
  }

  if (password !== adminPassword) {
    throw createError({ statusCode: 401, message: 'Invalid password' })
  }

  await setUserSession(event, { user: { admin: true } })
  return { ok: true }
})
