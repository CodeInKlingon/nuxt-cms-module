import { defineCollection } from '../../../src/runtime/composables/defineCollection'
import { medias } from '../../server/database/schema'

export default defineCollection({
  name: 'documents',
  schema: medias,

  options: {
    label: 'Documents',
    icon: 'i-lucide-file',
    sortable: true,
    searchable: true,
    searchColumns: ['filename', 'altText'],
    defaultSort: { field: 'createdAt', order: 'desc' },
    public: true,
  },

  dashboard: {
    list: {
      columns: [
        {
          field: 'filename',
          label: 'Filename',
          sortable: true,
          cell: { type: 'text', truncate: 40 },
        },
        {
          field: 'filepath',
          label: 'Path',
          cell: { type: 'text', truncate: 40 },
        },
        {
          field: 'altText',
          label: 'Alt Text',
          cell: { type: 'text', truncate: 40 },

        },
      ],
    },

    form: {
      sections: [
        {
          label: 'Document Details',
          fields: [
            {
              field: 'filename',
              label: 'Filename',
              widget: 'text',
              required: true,
              validation: [
                { type: 'min', value: 1, message: 'Filename is required' },
                { type: 'max', value: 255 },
              ],
            },
            {
              field: 'altText',
              label: 'Alt Text',
              widget: 'text',
              description: 'Accessible description of the media.',
            },
            {
              field: 'filepath',
              label: 'File Path',
              widget: 'file-picker',
              props: {
                accept: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                maxSize: 5 * 1024 * 1024,
              },
            },
          ],
        },
      ],
    },
  },
})
