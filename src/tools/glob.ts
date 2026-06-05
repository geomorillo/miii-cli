import { execa } from 'execa'
import type { Tool } from './types.js'

interface Input {
  pattern: string
  path?: string
  max_results?: number
}

function globToFindName(glob: string): string {
  return glob
}

export const glob: Tool<Input> = {
  name: 'glob',
  description: 'List files matching a glob pattern (e.g. "**/*.ts"). Uses ripgrep --files if available.',
  input_schema: {
    type: 'object',
    properties: {
      pattern:     { type: 'string', description: 'Glob pattern, e.g. "**/*.ts"' },
      path:        { type: 'string', description: 'Root path (default cwd)' },
      max_results: { type: 'number', description: 'Max paths returned (default 500)' },
    },
    required: ['pattern'],
  },
  handler: async ({ pattern, path, max_results }) => {
    const root = path ?? process.cwd()
    const limit = max_results ?? 500

    const tryRg = () =>
      execa('rg', ['--files', '--hidden', '--glob', pattern, root], {
        reject: false,
        timeout: 20000,
      })

    const tryFind = () => {
      const name = globToFindName(pattern.replace(/^\*\*\//, ''))
      return execa('find', [root, '-type', 'f', '-name', name], {
        reject: false,
        timeout: 20000,
      })
    }

    try {
      let res
      try {
        res = await tryRg()
        if (res.exitCode === 127 || (res.stderr ?? '').includes('command not found')) {
          res = await tryFind()
        }
      } catch {
        res = await tryFind()
      }
      const lines = (res.stdout ?? '').split('\n').filter(Boolean).slice(0, limit)
      if (lines.length === 0) return { content: 'No files matched.' }
      return { content: lines.join('\n') }
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), is_error: true }
    }
  },
}
