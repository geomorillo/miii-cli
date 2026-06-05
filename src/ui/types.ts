export interface ToolUseDisplay {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultDisplay {
  tool_use_id: string
  content: string
  is_error?: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  tool_uses?: ToolUseDisplay[]
  tool_results?: ToolResultDisplay[]
  tokens?: { prompt_eval: number; eval: number }
  duration?: number
}

export interface PermissionRequest {
  toolName: string
  input: unknown
  resolve: (answer: 'yes' | 'no') => void
}
