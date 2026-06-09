#!/usr/bin/env node
import { render } from 'ink'
import { createElement } from 'react'
import { App } from './ui/App.js'

const [, , cmd, ...rest] = process.argv

if (cmd === 'update' || cmd === '--update' || cmd === '-u') {
  // `miii --update` — self-update to the latest published version via npm.
  const { spawnSync } = await import('child_process')
  console.log('Updating miii-agent…')
  const r = spawnSync('npm', ['i', '-g', 'miii-agent@latest'], { stdio: 'inherit', shell: process.platform === 'win32' })
  process.exit(r.status ?? 1)
} else if (cmd === 'doctor' || cmd === 'eval') {
  // `miii doctor [models] [scenarioFilter]` — checks whether your installed
  // models can actually drive the agent. Bundled into the shipped binary by
  // tsup, so it works for global installs. `eval` is a hidden alias kept for
  // CI / `npm run eval`. Lazy-imported so normal TUI startup stays lean.
  const { runEval } = await import('../eval/run.js')
  process.exit(await runEval(rest))
} else {
  render(createElement(App))
}
