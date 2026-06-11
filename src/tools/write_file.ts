import { writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { confinePath } from './paths.js'
import { verifyHint } from './verifyHint.js'
import type { Tool } from './types.js'

interface Input {
  path: string
  content: string
}

export const write_file: Tool<Input> = {
  name: 'write_file',
  description: 'Create or overwrite a file with the given content. Parent dirs auto-created.',
  input_schema: {
    type: 'object',
    properties: {
      path:    { type: 'string', description: 'File path' },
      content: { type: 'string', description: 'Full file content' },
    },
    required: ['path', 'content'],
  },
  handler: ({ path, content }) => {
    try {
      const abs = confinePath(path)
      mkdirSync(dirname(abs), { recursive: true })
      writeFileSync(abs, content, 'utf-8')
      return { content: `Wrote ${path} (${content.length} bytes).${verifyHint(path)}` }
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), is_error: true }
    }
  },
}
