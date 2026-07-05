import { resolve, join, relative, isAbsolute, sep } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { defineEventHandler, getQuery, createError } from 'h3'

function getUploadDir(): string {
  const cwd = process.cwd()
  return cwd.endsWith('playground') || cwd.includes('playground')
    ? join(cwd, 'public/uploads')
    : join(cwd, 'playground/public/uploads')
}

function sanitizePath(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

function isWithinRoot(root: string, target: string): boolean {
  const rel = relative(root, target)
  return !rel.startsWith('..') && !isAbsolute(rel) && !rel.includes(sep + '..')
}

export default defineEventHandler(async (event): Promise<{ success: boolean, path: string }> => {
  const query = getQuery(event)
  const requestedPath = sanitizePath(query.path)

  if (!requestedPath) {
    throw createError({ statusCode: 400, statusMessage: 'Path is required' })
  }

  const uploadDir = getUploadDir()
  const targetDir = resolve(uploadDir, requestedPath)

  if (!isWithinRoot(uploadDir, targetDir)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  try {
    await mkdir(targetDir, { recursive: true })
    return {
      success: true,
      path: requestedPath,
    }
  }
  catch {
    throw createError({ statusCode: 500, statusMessage: 'Unable to create folder' })
  }
})
