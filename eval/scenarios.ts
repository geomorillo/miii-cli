import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { Scenario } from './types.js'

const read = (dir: string, f: string) =>
  existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf-8') : null

// Keep scenarios small, deterministic, and outcome-checked. One capability each.
// A scenario should fail loudly if the agent drifts, over-edits, or stops early.
export const scenarios: Scenario[] = [
  {
    name: 'edit-exact-string',
    prompt: 'In config.js, change the port from 3000 to 8080. Change nothing else.',
    files: { 'config.js': 'export const port = 3000\nexport const host = "localhost"\n' },
    check: (dir) => {
      const out = read(dir, 'config.js')
      if (out == null) return 'config.js missing'
      if (!out.includes('8080')) return 'port not changed to 8080'
      if (out.includes('3000')) return 'old port 3000 still present'
      if (!out.includes('host = "localhost"')) return 'unrelated line damaged'
      return true
    },
  },
  {
    name: 'read-then-answer',
    prompt: 'What is the value of the MAX_RETRIES constant in limits.js? Reply with just the number.',
    files: { 'limits.js': 'export const MAX_RETRIES = 7\n' },
    check: (dir, finalText) => {
      if (read(dir, 'limits.js')?.includes('MAX_RETRIES = 7') !== true)
        return 'agent mutated a read-only task'
      if (!/\b7\b/.test(finalText)) return `answer missing "7": ${JSON.stringify(finalText)}`
      return true
    },
  },
  {
    name: 'create-new-file',
    prompt: 'Create a file named greeting.txt containing exactly the text: hello world',
    check: (dir) => {
      const out = read(dir, 'greeting.txt')
      if (out == null) return 'greeting.txt not created'
      if (out.trim() !== 'hello world') return `wrong content: ${JSON.stringify(out)}`
      return true
    },
  },
  {
    name: 'grep-locate',
    prompt: 'Which file defines a function called computeTax? Reply with just the filename.',
    files: {
      'a.js': 'export function formatDate() {}\n',
      'b.js': 'export function computeTax(x) { return x * 0.1 }\n',
      'c.js': 'export function parseArgs() {}\n',
    },
    check: (dir, finalText) => {
      if (read(dir, 'b.js')?.includes('computeTax') !== true) return 'b.js damaged'
      if (!/\bb\.js\b/.test(finalText)) return `answer missing "b.js": ${JSON.stringify(finalText)}`
      return true
    },
  },
]
