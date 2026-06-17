import { createError, getRouterParam, readMultipartFormData } from 'h3'
import { eq } from 'drizzle-orm'
import db from '../../../../database'
import { medias } from '../../../../database/schema'
import { deleteUploadedFile, saveUploadedFile } from '../../../../utils/media'

/**
 * POST /api/cms/media/:id/replace
 *
 * Replaces the file associated with an existing media record.
 * Protected by the CMS auth middleware.
 * Deletes the old file from disk, saves the new file, updates the record,
 * and returns the new public path.
 */
export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = idParam ? Number.parseInt(idParam, 10) : Number.NaN

  if (Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid media id' })
  }

  const existing = await db.select().from(medias).where(eq(medias.id, id)).limit(1)

  const media = existing[0]

  if (!media) {
    throw createError({ statusCode: 404, statusMessage: 'Media not found' })
  }

  if (!media.filename) {
    throw createError({ statusCode: 500, statusMessage: 'Existing media has no filename' })
  }

  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const filePart = formData.find(part => part.filename && part.data)

  if (!filePart || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const saved = await saveUploadedFile(filePart.data, filePart.filename)

  await db.update(medias).set({
    filename: saved.filename,
    filepath: saved.filepath,
    updatedAt: new Date(),
  }).where(eq(medias.id, id))

  await deleteUploadedFile(media.filename)

  return {
    success: true,
    filename: saved.filename,
    filepath: saved.filepath,
  }
})
