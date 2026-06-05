import { execa } from 'execa'
import type { Tool } from './types.js'

interface Input {
  command: string
  timeout_ms?: number
}

export const run_bash: Tool<Input> = {
  name: 'run_bash',
  description: 'Execute a shell command via bash. Returns stdout+stderr. Non-interactive only.',
  input_schema: {
    type: 'object',
    properties: {
      command:    { type: 'string', description: 'Shell command to run' },
      timeout_ms: { type: 'number', description: 'Timeout in ms (default 30000)' },
    },
    required: ['command'],
  },
  handler: async ({ command, timeout_ms }) => {
    try {
      const { stdout, stderr, exitCode } = await execa('bash', ['-c', command], {
        timeout: timeout_ms ?? 30000,
        reject: false,
        all: false,
      })
      const out = [stdout, stderr].filter(Boolean).join('\n')
      const tag = `[exit ${exitCode}]`
      return {
        content: `${tag}\n${out}`.slice(0, 32000),
        is_error: exitCode !== 0,
      }
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), is_error: true }
    }
  },
}
