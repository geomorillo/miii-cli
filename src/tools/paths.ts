import { resolve, relative, isAbsolute, sep } from 'path'

/**
 * Resolve a tool-supplied path against the current working directory and reject
 * any path that escapes it. Returns the absolute, confined path.
 *
 * Blocks `../` traversal, absolute paths outside cwd, and symlink-style escapes
 * expressed as relative segments. Throws a clear Error the tool turns into an
 * is_error result.
 */
export function confinePath(p: string): string {
  if (typeof p !== 'string' || p.length === 0) {
    throw new Error('Path is required.')
  }
  const root = process.cwd()
  const abs = resolve(root, p)
  const rel = relative(root, abs)
  if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
    throw new Error(`Path "${p}" is outside the working directory (${root}). Access denied.`)
  }
  return abs
}
