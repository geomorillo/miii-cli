import { execa } from 'execa'
import type { Tool } from './types.js'

interface Input {
  command: string
  timeout_ms?: number
}

export const run_bash: Tool<Input> = {
  name: 'run_bash',
  description: 'Execute a shell command (bash on Unix, cmd on Windows). Returns stdout+stderr. Non-interactive only.',
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
      const isWin = process.platform === 'win32'
      const shell = isWin ? 'cmd' : 'bash'
      const shellArgs = isWin ? ['/c', command] : ['-c', command]
      const { stdout, stderr, exitCode } = await execa(shell, shellArgs, {
        timeout: timeout_ms ?? 30000,
        reject: false,
        all: false,
      })
      const out = [stdout, stderr].filter(Boolean).join('\n')
      const is_error = exitCode !== 0
      const body = out || (is_error ? `(no output)` : '')
      const content = `${body}\n[exit ${exitCode}]`
      return {
        content: content.slice(0, 32000),
        is_error,
      }
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), is_error: true }
    }
  },
}
