import { readdir, stat } from 'node:fs/promises'
import { resolve, relative, sep, isAbsolute } from 'node:path'
import { defineEventHandler, getQuery, createError } from 'h3'
import type { FileSystemItem, PaginatedFileSystemItems } from '../../../../types/files'

function getUploadDir(): string {
  const cwd = process.cwd()
  return cwd.endsWith('playground') || cwd.includes('playground')
    ? resolve(cwd, 'public/uploads')
    : resolve(cwd, 'playground/public/uploads')
}

function sanitizePath(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

function parsePagination(query: Record<string, unknown>): { page: number, limit: number } {
  const page = typeof query.page === 'string' ? Number.parseInt(query.page, 10) : 1
  const limit = typeof query.limit === 'string' ? Number.parseInt(query.limit, 10) : 20
  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    limit: Number.isNaN(limit) || limit < 1 ? 20 : limit,
  }
}

function isWithinRoot(root: string, target: string): boolean {
  const rel = relative(root, target)
  return !rel.startsWith('..') && !isAbsolute(rel) && !rel.includes(`${sep}..`)
}

export default defineEventHandler(async (event): Promise<PaginatedFileSystemItems> => {
  const query = getQuery(event)
  const requestedPath = sanitizePath(query.path)
  const { page, limit } = parsePagination(query)
  const uploadDir = getUploadDir()
  const targetDir = resolve(uploadDir, requestedPath)

  if (!isWithinRoot(uploadDir, targetDir)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  try {
    const entries = await readdir(targetDir, { withFileTypes: true })
    const items = []

    for (const entry of entries) {
      const relativePath = requestedPath
        ? `${requestedPath}/${entry.name}`
        : entry.name
      const fullPath = resolve(targetDir, entry.name)
      const info = await stat(fullPath)

      const item: FileSystemItem = {
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: relativePath,
        size: info.size,
        updatedAt: info.mtime.getTime(),
      }

      if (item.type === 'file') {
        item.url = `/uploads/${relativePath.replace(/\\/g, '/')}`
      }

      items.push(item)
    }

    items.sort((a, b) => a.name.localeCompare(b.name))

    const start = (page - 1) * limit
    const paginatedItems = items.slice(start, start + limit)

    return {
      items: paginatedItems,
      total: items.length,
    }
  }
  catch {
    throw createError({ statusCode: 500, statusMessage: 'Unable to read directory' })
  }
})
