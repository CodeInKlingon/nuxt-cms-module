import type { Component } from 'vue'

/**
 * Get a widget component from the registry
 * @param widgetName - The name of the widget (e.g., 'text', 'custom-widget')
 * @returns A function that loads the widget component, or null if not found
 */
export async function getWidget(widgetName: string): Promise<(() => Promise<Component>) | null> {
  try {
    // @ts-expect-error - Virtual module
    const widgetsModule = await import('#cms/widgets')
    const loader = widgetsModule.getWidget(widgetName)
    return loader || null
  }
  catch {
    console.error(`Widget not found: ${widgetName}`)
    return null
  }
}
