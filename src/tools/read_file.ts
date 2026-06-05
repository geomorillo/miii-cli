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
      return { content: readFileSync(path, 'utf-8') }
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), is_error: true }
    }
  },
}
