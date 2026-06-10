import { readFileSync, writeFileSync } from 'fs'
import { confinePath } from './paths.js'
import type { Tool } from './types.js'

interface Input {
  path: string
  old_str: string
  new_str: string
  replace_all?: boolean
}

/** Cheap line-similarity: fraction of matching chars by position, ignoring leading/trailing ws. */
function similarity(a: string, b: string): number {
  const x = a.trim()
  const y = b.trim()
  if (!x && !y) return 1
  const len = Math.max(x.length, y.length)
  if (len === 0) return 0
  let same = 0
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] === y[i]) same++
  return same / len
}

/**
 * old_str didn't match. Find the source region most like it and show it back
 * with line numbers, so the model can see the real whitespace/text instead of
 * guessing again. This is the most expensive failure in an agent loop.
 */
function nearMiss(src: string, old_str: string): string {
  const srcLines = src.split('\n')
  const needle = old_str.split('\n').find((l) => l.trim()) ?? old_str
  let bestIdx = -1
  let bestScore = 0
  for (let i = 0; i < srcLines.length; i++) {
    const s = similarity(srcLines[i], needle)
    if (s > bestScore) {
      bestScore = s
      bestIdx = i
    }
  }
  if (bestIdx === -1 || bestScore < 0.4) return ''
  const from = Math.max(0, bestIdx - 3)
  const to = Math.min(srcLines.length, bestIdx + 4)
  const width = String(to).length
  const ctx = srcLines
    .slice(from, to)
    .map((l, i) => `${String(from + i + 1).padStart(width, ' ')}\t${l}`)
    .join('\n')
  return `\nClosest text in file (lines ${from + 1}-${to}):\n${ctx}`
}

export const edit_file: Tool<Input> = {
  name: 'edit_file',
  description:
    'Replace an exact string in a file. old_str must be unique unless replace_all is set. On no match, returns the closest text in the file.',
  input_schema: {
    type: 'object',
    properties: {
      path:        { type: 'string', description: 'File path' },
      old_str:     { type: 'string', description: 'Exact text to replace (whitespace-sensitive)' },
      new_str:     { type: 'string', description: 'Replacement text' },
      replace_all: { type: 'boolean', description: 'Replace every occurrence instead of requiring uniqueness' },
    },
    required: ['path', 'old_str', 'new_str'],
  },
  handler: ({ path, old_str, new_str, replace_all }) => {
    try {
      if (old_str === new_str) {
        return { content: `old_str and new_str are identical — nothing to change in ${path}.`, is_error: true }
      }
      const abs = confinePath(path)
      const src = readFileSync(abs, 'utf-8')
      const first = src.indexOf(old_str)
      if (first === -1) {
        return { content: `old_str not found in ${path}.${nearMiss(src, old_str)}`, is_error: true }
      }
      const all = replace_all === true
      if (!all && src.indexOf(old_str, first + 1) !== -1) {
        return {
          content: `old_str not unique in ${path}. Add surrounding context to disambiguate, or set replace_all.`,
          is_error: true,
        }
      }
      const out = all ? src.split(old_str).join(new_str) : src.slice(0, first) + new_str + src.slice(first + old_str.length)
      const n = all ? src.split(old_str).length - 1 : 1
      writeFileSync(abs, out, 'utf-8')
      return { content: `Edited ${path}${all ? ` (${n} occurrences)` : ''}` }
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), is_error: true }
    }
  },
}
