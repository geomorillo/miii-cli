import { readFileSync } from 'fs'
import { confinePath } from './paths.js'
import type { Tool } from './types.js'

interface Input {
  path: string
  offset?: number
  limit?: number
}

/** Left-pad a line number to width for stable, greppable columns. */
function numbered(lines: string[], start: number): string {
  const width = String(start + lines.length - 1).length
  return lines
    .map((l, i) => `${String(start + i).padStart(width, ' ')}\t${l}`)
    .join('\n')
}

export const read_file: Tool<Input> = {
  name: 'read_file',
  description:
    'Read file contents as UTF-8 text with line numbers. Use offset/limit to read a range of a large file instead of the whole thing.',
  input_schema: {
    type: 'object',
    properties: {
      path:   { type: 'string', description: 'File path' },
      offset: { type: 'number', description: '1-based line to start from (default 1)' },
      limit:  { type: 'number', description: 'Max lines to return (default all / capped)' },
    },
    required: ['path'],
  },
  handler: ({ path, offset, limit }) => {
    try {
      const MAX_CHARS = 200_000
      const buf = readFileSync(confinePath(path))
      // Refuse binary — NUL byte in the head is the cheap, reliable signal.
      if (buf.subarray(0, 8000).includes(0)) {
        return { content: `${path} looks binary (${buf.length} bytes); not reading as text.`, is_error: true }
      }
      // Normalize CRLF so the \r doesn't ride along on every numbered line.
      const raw = buf.toString('utf-8').replace(/\r\n/g, '\n')
      const allLines = raw.split('\n')
      const total = allLines.length

      const start = Math.max(1, Math.floor(offset ?? 1))
      const ranged = offset != null || limit != null
      const count = limit != null ? Math.max(0, Math.floor(limit)) : total
      const slice = allLines.slice(start - 1, start - 1 + count)

      let body = numbered(slice, start)
      if (body.length > MAX_CHARS) {
        body = body.slice(0, MAX_CHARS) + `\n[truncated: output exceeded ${MAX_CHARS} chars — use offset/limit]`
      }
      if (ranged) {
        const end = start - 1 + slice.length
        body += `\n[showing lines ${start}-${end} of ${total}]`
      }
      return { content: body }
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), is_error: true }
    }
  },
}
