import { readFileSync } from 'fs'
import type { Tool } from './types.js'

interface Input {
  path: string
}

export const read_file: Tool<Input> = {
  name: 'read_file',
  description: 'Read entire file contents as UTF-8 text.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' },
    },
    required: ['path'],
  },
  handler: ({ path }) => {
    try {
      const MAX = 200_000
      const raw = readFileSync(path, 'utf-8')
      const truncated = raw.length > MAX
      const body = truncated ? raw.slice(0, MAX) + `\n[truncated: ${raw.length - MAX} more chars]` : raw
      return { content: body }
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), is_error: true }
    }
  },
}
