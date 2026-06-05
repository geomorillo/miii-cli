import { Ollama, type Message, type Tool, type ChatResponse } from 'ollama'
import type { OllamaMessage, OllamaTool, ChatChunk } from './types.js'

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST ?? 'http://localhost:11434',
})

const OLLAMA_NOT_RUNNING = 'Ollama is not running. Start it with: ollama serve'

function isConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('connect')
}

export async function listModels(): Promise<string[]> {
  try {
    const { models } = await ollama.list()
    return models.map((m) => m.name)
  } catch (err) {
    if (isConnectionError(err)) {
      throw new Error(OLLAMA_NOT_RUNNING)
    }
    throw err
  }
}

export async function modelContext(model: string): Promise<number> {
  try {
    const info = await ollama.show({ model })
    const modelInfo = info.model_info as unknown as Record<string, unknown> | undefined
    if (modelInfo) {
      const ctxKey = Object.keys(modelInfo).find((k) => k.includes('context_length'))
      if (ctxKey) {
        const val = Number(modelInfo[ctxKey])
        if (!isNaN(val) && val > 0) return val
      }
    }
    return 2048
  } catch (err) {
    if (isConnectionError(err)) {
      throw new Error(OLLAMA_NOT_RUNNING)
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('unknown model')) {
      throw new Error(`Model "${model}" not found. Run: ollama pull ${model}`)
    }
    throw err
  }
}

export async function* chat(
  model: string,
  messages: OllamaMessage[],
  tools?: OllamaTool[],
): AsyncGenerator<ChatChunk> {
  let stream: AsyncIterable<ChatResponse>
  try {
    stream = await ollama.chat({
      model,
      messages: messages as Message[],
      tools: tools as Tool[] | undefined,
      stream: true,
    })
  } catch (err) {
    if (isConnectionError(err)) {
      throw new Error(OLLAMA_NOT_RUNNING)
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('unknown model')) {
      throw new Error(`Model "${model}" not found. Run: ollama pull ${model}`)
    }
    throw err
  }
  try {
    for await (const chunk of stream) {
      yield {
        content: chunk.message.content,
        done: chunk.done,
        tool_calls: chunk.message.tool_calls as ChatChunk['tool_calls'],
        prompt_eval_count: chunk.prompt_eval_count,
        eval_count: chunk.eval_count,
      }
    }
  } catch (err) {
    if (isConnectionError(err)) {
      throw new Error(OLLAMA_NOT_RUNNING)
    }
    throw err
  }
}
