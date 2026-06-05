export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  tokens?: { prompt_eval: number; eval: number }
  duration?: number
}
