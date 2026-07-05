import { describe, expect, it } from 'vitest'
import { defineCustomPage } from '../src/runtime/composables/defineCustomPage'

describe('defineCustomPage', () => {
  it('should return a custom page definition', () => {
    const page = defineCustomPage({
      name: 'media',
      label: 'Media Library',
      icon: 'i-lucide-image',
      component: './cms/pages/MediaLibrary.vue',
    })

    expect(page).toEqual({
      name: 'media',
      label: 'Media Library',
      icon: 'i-lucide-image',
      component: './cms/pages/MediaLibrary.vue',
    })
  })

  it('should throw when name is missing', () => {
    expect(() =>
      defineCustomPage({
        name: '',
        label: 'Media Library',
        component: './cms/pages/MediaLibrary.vue',
      }),
    ).toThrow('Custom page must have a name')
  })

  it('should throw when label is missing', () => {
    expect(() =>
      defineCustomPage({
        name: 'media',
        label: '',
        component: './cms/pages/MediaLibrary.vue',
      }),
    ).toThrow('Custom page "media" must have a label')
  })

  it('should throw when component is missing', () => {
    expect(() =>
      defineCustomPage({
        name: 'media',
        label: 'Media Library',
        component: '',
      }),
    ).toThrow('Custom page "media" must have a component path')
  })
})
