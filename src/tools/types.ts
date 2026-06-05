export interface JsonSchema {
  type: 'object'
  properties: Record<string, { type: string; description?: string; enum?: string[] }>
  required?: string[]
}

export interface ToolResult {
  content: string
  is_error?: boolean
}

export interface Tool<I = Record<string, unknown>> {
  name: string
  description: string
  input_schema: JsonSchema
  handler: (input: I) => Promise<ToolResult> | ToolResult
}
