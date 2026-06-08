import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { tmpdir } from 'os'
import { runAgent } from '../src/agent/loop.js'
import type { PermissionContext } from '../src/permissions/policy.js'
import type { Scenario, Result } from './types.js'

// Eval runs unattended: every tool call is auto-approved. The permission layer
// is exercised by unit tests, not here — here we measure task completion.
const autoYes: PermissionContext = { ask: async () => 'yes' }

/**
 * Run one scenario end-to-end against a real model and return its metrics.
 *
 * Tools confine to process.cwd() (see src/tools/paths.ts), so we chdir into a
 * throwaway temp dir per scenario, run, then restore. Sequential only — chdir is
 * process-global; never run two scenarios concurrently.
 */
export async function runScenario(model: string, s: Scenario): Promise<Result> {
  const dir = mkdtempSync(join(tmpdir(), 'miii-eval-'))
  const prevCwd = process.cwd()

  for (const [rel, content] of Object.entries(s.files ?? {})) {
    const abs = join(dir, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf-8')
  }

  const r: Result = {
    name: s.name,
    pass: false,
    toolCalls: 0,
    promptTokens: 0,
    evalTokens: 0,
    durationMs: 0,
  }
  const start = Date.now()

  let finalText = ''
  try {
    process.chdir(dir)
    const gen = runAgent({
      model,
      cwd: dir,
      history: [],
      userText: s.prompt,
      permissions: autoYes,
    })
    for await (const ev of gen) {
      if (ev.type === 'tool-use') r.toolCalls++
      else if (ev.type === 'text-delta') finalText += ev.text
      else if (ev.type === 'turn-end' && ev.stop_reason === 'tool_use') finalText = ''
      else if (ev.type === 'done') {
        r.promptTokens = ev.prompt_tokens
        r.evalTokens = ev.eval_tokens
      } else if (ev.type === 'error') r.error = ev.message
    }
  } catch (err) {
    r.error = err instanceof Error ? err.message : String(err)
  } finally {
    process.chdir(prevCwd)
  }
  r.durationMs = Date.now() - start

  // A loop-level error (model missing, repetition kill, stream fail) is an
  // automatic fail — never let a check false-pass over a broken run.
  if (r.error) {
    r.reason = `loop error: ${r.error}`
    rmSync(dir, { recursive: true, force: true })
    return r
  }

  // Assertion runs against the temp dir while it still exists.
  try {
    const verdict = await s.check(dir, finalText.trim())
    if (verdict === true) r.pass = true
    else r.reason = typeof verdict === 'string' ? verdict : 'check returned false'
  } catch (err) {
    r.reason = `check threw: ${err instanceof Error ? err.message : String(err)}`
  }

  rmSync(dir, { recursive: true, force: true })
  return r
}
