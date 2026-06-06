import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const PKG_NAME = 'miii-agent'

function currentVersion(): string {
  try {
    return (require('../package.json') as { version: string }).version
  } catch {
    return ''
  }
}

function newerVersion(current: string, latest: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [ca, cb, cc] = parse(current)
  const [la, lb, lc] = parse(latest)
  if (la !== ca) return la > ca
  if (lb !== cb) return lb > cb
  return lc > cc
}

export async function checkForUpdate(): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${PKG_NAME}/latest`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    const data = await res.json() as { version: string }
    const latest = data.version
    const current = currentVersion()
    if (current && newerVersion(current, latest)) return latest
    return null
  } catch {
    return null
  }
}
