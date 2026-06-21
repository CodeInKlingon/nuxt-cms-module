import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async (_event) => {
  // TODO: Implement media file serving
  // This will serve uploaded media files

  throw createError({
    statusCode: 501,
    message: 'Media serving not yet implemented',
  })
})
