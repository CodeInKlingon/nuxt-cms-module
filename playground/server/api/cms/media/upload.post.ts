import { createError, readMultipartFormData } from 'h3'
import { saveUploadedFile } from '../../../utils/media'

/**
 * POST /api/cms/media/upload
 *
 * Accepts a multipart form upload and saves the first file to disk.
 * Protected by the CMS auth middleware.
 * Returns the public path of the saved file.
 */
export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const filePart = formData.find(part => part.filename && part.data)

  if (!filePart || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const saved = await saveUploadedFile(filePart.data, filePart.filename)

  return {
    success: true,
    filename: saved.filename,
    filepath: saved.filepath,
  }
})
