import { ref, shallowRef } from 'vue'

// Cache for loaded block components
const blockCache = new Map<string, any>()

/**
 * Load a block component from the registry
 * @param blockType - The name of the block component (e.g., 'HeroSection')
 * @returns The component definition with props containing field definitions
 */
export async function loadBlockComponent(blockType: string): Promise<any> {
  // Check cache first
  if (blockCache.has(blockType)) {
    return blockCache.get(blockType)
  }

  try {
    // Import from the virtual module
    // @ts-ignore - Virtual module
    const blocksModule = await import('#cms/blocks')
    const component = await blocksModule.loadBlockComponent(blockType)

    if (component) {
      blockCache.set(blockType, component)
      return component
    }
    else {
      console.error(`Block component not found in registry: ${blockType}`)
      return null
    }
  }
  catch (error) {
    console.error(`Failed to load block component: ${blockType}`, error)
    return null
  }
}

/**
 * Extract field definitions from a block component's props
 * @param component - The Vue component definition
 * @returns Array of field definitions [fieldName, fieldDefinition]
 */
export function extractBlockFields(component: any): Array<[string, any]> {
  if (!component?.props) {
    return []
  }

  // Extract props that have cms metadata
  return Object.entries(component.props)
    .filter(([_, prop]: [string, any]) => prop?.cms)
    .map(([name, prop]: [string, any]) => [name, prop])
}

/**
 * Get default values for all fields in a block
 * @param component - The Vue component definition
 * @returns Object with field names as keys and default values
 */
export function getBlockDefaults(component: any): Record<string, any> {
  const fields = extractBlockFields(component)
  const defaults: Record<string, any> = {}

  for (const [name, fieldDef] of fields) {
    // Get default value from the field definition
    if (fieldDef?.default !== undefined) {
      defaults[name] = typeof fieldDef.default === 'function'
        ? fieldDef.default()
        : fieldDef.default
    }
    else {
      // Set sensible defaults based on widget type
      defaults[name] = getDefaultForWidget(fieldDef?.cms?.widget)
    }
  }

  return defaults
}

function getDefaultForWidget(widget?: string): any {
  switch (widget) {
    case 'text':
    case 'textarea':
      return ''
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'select':
      return ''
    case 'link':
      return { url: '', label: '', target: '_self' }
    case 'blocks':
      return []
    default:
      return null
  }
}

/**
 * Composable for working with block components
 */
export function useBlockComponents() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentComponent = shallowRef<any>(null)
  const currentFields = ref<Array<[string, any]>>([])

  /**
   * Load a block and extract its fields
   */
  async function loadBlock(blockType: string) {
    loading.value = true
    error.value = null

    try {
      const component = await loadBlockComponent(blockType)
      if (component) {
        currentComponent.value = component
        currentFields.value = extractBlockFields(component)
        return {
          component,
          fields: currentFields.value,
          defaults: getBlockDefaults(component),
        }
      }
      else {
        error.value = `Block "${blockType}" not found`
        return null
      }
    }
    catch (err) {
      error.value = `Failed to load block: ${err}`
      return null
    }
    finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    currentComponent,
    currentFields,
    loadBlock,
    loadBlockComponent,
    extractBlockFields,
    getBlockDefaults,
  }
}
