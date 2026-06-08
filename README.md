# miii

> small · simple · smart · strategic · semantic
>
> Your code never leaves your machine. No API keys. No cloud. No bullshit.

**miii** is a local-first AI coding agent that lives in your terminal. Powered by [Ollama](https://ollama.com), it reads your code, writes features, runs tests, and fixes bugs — entirely on your hardware, at native speed.

[![npm](https://img.shields.io/npm/v/miii-agent)](https://www.npmjs.com/package/miii-agent)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## The name

**miii** stands for five principles it's built around:

- **small** — tight codebase, no bloat. You can read the whole thing.
- **simple** — no API keys, no accounts, no config ceremony. Just run it.
- **smart** — decomposes problems and verifies its own work like an engineer.
- **strategic** — plans before it acts; tools are gated, paths are confined.
- **semantic** — works from the meaning of your code, not blind text matching.

---

## Demo

![miii demo](demo.gif)

---

## Why miii?

Most AI coding tools are wrappers around cloud APIs. They're slow, expensive, and send your private code to someone else's server.

miii is different:

- **Local-first** — Powered by Ollama. Your code stays on your disk, period.
- **Zero ceremony** — No API keys. No billing. No accounts. Just `miii`.
- **Actually agentic** — miii doesn't just chat. It decomposes problems, calls tools, and verifies results like an engineer would.
- **Fast** — No network round-trips. Response time is limited by your GPU, not a CDN.

---

## Installation

### Prerequisites

- **Node.js** ≥ 18
- **Ollama** running locally — [install here](https://ollama.com/download)
- A coding model pulled locally:

```bash
ollama pull qwen2.5-coder:14b
# or any model you prefer
ollama pull deepseek-coder-v2
```

### Install miii

```bash
npm install -g miii-agent
```

### Launch

```bash
miii
```

That's it.

---

## Usage

Once inside the TUI, just type naturally:

```
> refactor the auth module to use async/await
> @src/server.ts add rate limiting to all POST routes
> why are my tests failing in utils/parser.ts
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send prompt |
| `@filename` | Attach file to context |
| `/models` | Switch active Ollama model |
| `/clear` | Reset conversation history |
| `Esc` | Stop current generation or tool run |
| `Ctrl+C` | Quit |

---

## Configuration

Settings live in `~/.miii/config.json` and are created on first run.

```json
{
  "model": "qwen2.5-coder:14b",
  "ollamaHost": "http://localhost:11434",
  "effort": "medium"
}
```

| Field | Description | Values |
|-------|-------------|--------|
| `model` | Default Ollama model | any `ollama list` model |
| `ollamaHost` | Ollama API endpoint | URL string |
| `effort` | Controls temperature & limits | `low` \| `medium` \| `high` |

---

## Capabilities

miii ships with a built-in tool suite the agent can invoke autonomously:

| Tool | What it does |
|------|-------------|
| `read_file` | Read any file in your workspace |
| `write_file` | Create new files |
| `edit_file` | Precise string-level edits (no rewrites) |
| `glob` | Pattern-match files across the project |
| `grep` | Regex search across files |
| `run_bash` | Execute shell commands |

Every sensitive operation is gated by a permission system — you approve what the agent can touch, and "always" approvals persist to `~/.miii/permissions.json` so you're never asked twice. File tools are confined to your working directory; `../` traversal and absolute paths outside it are rejected.

---

## Architecture

```mermaid
graph TD
    User["User (Terminal)"] -->|"prompt / @file / /cmd"| InputBar

    subgraph TUI ["Ink TUI (React)"]
        InputBar["InputBar"] --> App["App.tsx"]
        App --> ChatView["ChatView"]
        App --> CommandPalette["CommandPalette\n(/models, /clear)"]
        App --> FilePicker["FilePicker (@file)"]
        App --> ModelsView["ModelsView"]
    end

    App -->|"user message"| AgentLoop["Agent Loop\n(agent/loop.ts)"]

    subgraph Agent ["Agent Layer"]
        AgentLoop -->|"chat request"| Adapter["Ollama Adapter\n(agent/adapter.ts)"]
        AgentLoop -->|"1. validate input"| Validate["Input Validator\n(tools/validate.ts)"]
        AgentLoop -->|"2. permission check"| Policy["Permission Policy\n(permissions/policy.ts)"]
        AgentLoop -->|"3. tool call"| ToolRegistry["Tool Registry\n(tools/registry.ts)"]
        AgentLoop -->|"events"| EventBus["Event Bus\n(hooks/bus.ts)"]
    end

    subgraph Tools ["Tools"]
        ToolRegistry --> ReadFile["read_file"]
        ToolRegistry --> WriteFile["write_file"]
        ToolRegistry --> EditFile["edit_file"]
        ToolRegistry --> Glob["glob"]
        ToolRegistry --> Grep["grep"]
        ToolRegistry --> RunBash["run_bash"]
        ReadFile -.-> Confine["Path Confinement\n(tools/paths.ts)"]
        WriteFile -.-> Confine
        EditFile -.-> Confine
    end

    Adapter -->|"HTTP streaming"| Ollama["Ollama\n(local LLM server)"]
    Ollama -->|"model response\n+ tool calls"| Adapter

    Tools -->|"tool results"| AgentLoop
    EventBus -->|"stream events"| ChatView

    subgraph Storage ["Local Storage"]
        Config["~/.miii/config.json\n(model, host, effort)"]
        Rules["~/.miii/permissions.json\n(saved allow rules)"]
    end

    App -.->|"reads"| Config
    Policy -.->|"reads / persists 'always'"| Rules
```

---

## Development

```bash
git clone https://github.com/maruakshay/miii-cli.git
cd miii-cli
npm install
npm run dev
```

```bash
npm run build   # production build
npm run start   # run built output
```

---

## Project Status

MVP. Core agent loop works. Actively refining tool execution, streaming, and the permission model. PRs welcome — fork it, break it, improve it.

---

## License

MIT © [maruakshay](https://github.com/maruakshay)

---

<p align="center">
  Built for engineers who'd rather own their tools than rent them.
</p>
