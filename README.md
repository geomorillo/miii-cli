# miii

**Fastest coding agent in your terminal.** A local-first, zero-config CLI coding companion that pairs a tight Ink TUI with your own Ollama models — chat, edit files, and run commands without API keys, cloud round-trips, or latency tax.

Built because every other CLI agent felt slow.

```
$ miii
● qwen2.5-coder  ·  ready
> fix the flaky test in auth.spec.ts
```

## Why

Cloud agents = network round-trips, rate limits, $$$, your code leaving your machine.
miii = local Ollama model + tight Ink TUI + zero ceremony. It just rips.

## Prerequisites

- **Node.js** 18+ and npm
- **[Ollama](https://ollama.com)** installed and running locally (`ollama serve`)
- A pulled coder model, e.g.:

  ```bash
  ollama pull qwen2.5-coder:14b
  ```

## Installation

Install globally from npm:

```bash
npm i -g miii-cli
```

Verify:

```bash
miii --version
```

## Use

Launch TUI in current directory — auto-detects your Ollama models and drops you into a chat session scoped to the working dir:

```bash
miii
```

Inside the TUI:

- **type** → send a message to the agent
- **`@file`** → mention a file; contents get inlined into context
- **`/clear`** → wipe conversation history, keep model + cwd
- **`/models`** → open picker to switch between installed Ollama models
- **`esc`** → abort the in-flight response or tool call
- **`ctrl+c`** → quit miii

The header shows live context usage. When the active context exceeds **70%** of the model's window, miii flags it inline so you can `/clear` or compact before the model starts dropping earlier turns.

## Tools the agent gets

`read_file` · `write_file` · `edit_file` · `run_bash` · `glob` · `grep` · `run_bash`

Sensitive ops ask permission. Deny one, agent tries another or stops clean.

## Dev

```bash
git clone <repo> && cd miii-cli
npm i
npm run dev
```

---

Made because waiting on tokens is the worst part of coding with AI.
