import type { CrudContext } from '../../types'

/**
 * Execute a hook function with error handling
 */
export async function executeHooks<T>(
  hook: Function,
  data: T,
  context: CrudContext,
): Promise<T> {
  try {
    const result = await hook(data, context)
    return result !== undefined ? result : data
  }
  catch (error: any) {
    console.error(`Hook execution failed in ${context.collection}:`, error)
    throw error
  }
}
