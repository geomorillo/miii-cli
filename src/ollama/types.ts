export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls?: OllamaToolCall[]
  images?: string[]
}

export interface OllamaToolCall {
  function: {
    name: string
    arguments: Record<string, unknown>
  }
}

export interface OllamaTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export interface ChatChunk {
  content: string
  done: boolean
  tool_calls?: OllamaToolCall[]
  prompt_eval_count?: number
  eval_count?: number
}
