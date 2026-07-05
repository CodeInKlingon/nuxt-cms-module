import { existsSync } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const UPLOAD_DIR = 'public/uploads'

const baseDir = process.cwd().endsWith('playground') || process.cwd().includes('playground')
  ? process.cwd()
  : join(process.cwd(), 'playground')

export interface SavedFile {
  filename: string
  filepath: string
  fullPath: string
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.-]/g, '-')
}

function generateUniqueFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName)
  const timestamp = Date.now()
  return `${timestamp}-${sanitized}`
}

export function resolveUploadPath(filename: string): string {
  return join(baseDir, UPLOAD_DIR, filename)
}

export function resolvePublicPath(filename: string): string {
  return `/${UPLOAD_DIR.replace(/^public\//, '')}/${filename}`
}

export async function saveUploadedFile(data: Buffer, originalName: string): Promise<SavedFile> {
  const filename = generateUniqueFilename(originalName)
  const fullPath = resolveUploadPath(filename)

  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, data)

  return {
    filename,
    filepath: resolvePublicPath(filename),
    fullPath,
  }
}

export async function deleteUploadedFile(filename: string): Promise<void> {
  const fullPath = resolveUploadPath(filename)
  if (existsSync(fullPath)) {
    await unlink(fullPath)
  }
}
