// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
  features: {
    // Rules for module authors
    tooling: true,
    // Rules for formatting
    stylistic: true,
  },
  dirs: {
    src: [
      './playground',
    ],
  },
})
  .append(
  )
  // Nuxt page files are auto-registered as components with single-word names — this is expected
  .override('nuxt/vue/rules', {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  })
