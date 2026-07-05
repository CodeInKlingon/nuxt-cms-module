import type { CrudContext } from '../../types'

/**
 * Execute a hook function with error handling
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HookFn = (...args: any[]) => any

export async function executeHooks<T>(
  hook: HookFn,
  data: T,
  context: CrudContext,
): Promise<T> {
  try {
    const result = await hook(data, context)
    return result !== undefined ? result : data
  }
  catch (error: unknown) {
    console.error(`Hook execution failed in ${context.collection}:`, error)
    throw error
  }
}
