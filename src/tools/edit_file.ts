import { readFileSync, writeFileSync } from 'fs'
import { confinePath } from './paths.js'
import type { Tool } from './types.js'

interface Input {
  path: string
  old_str: string
  new_str: string
}

export const edit_file: Tool<Input> = {
  name: 'edit_file',
  description: 'Replace an exact string in a file. old_str must be unique.',
  input_schema: {
    type: 'object',
    properties: {
      path:    { type: 'string', description: 'File path' },
      old_str: { type: 'string', description: 'Exact text to replace' },
      new_str: { type: 'string', description: 'Replacement text' },
    },
    required: ['path', 'old_str', 'new_str'],
  },
  handler: ({ path, old_str, new_str }) => {
    try {
      const abs = confinePath(path)
      const src = readFileSync(abs, 'utf-8')
      const first = src.indexOf(old_str)
      if (first === -1) {
        return { content: `old_str not found in ${path}`, is_error: true }
      }
      if (src.indexOf(old_str, first + 1) !== -1) {
        return { content: `old_str not unique in ${path}`, is_error: true }
      }
      writeFileSync(abs, src.slice(0, first) + new_str + src.slice(first + old_str.length), 'utf-8')
      return { content: `Edited ${path}` }
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), is_error: true }
    }
  },
}

