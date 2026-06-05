import { useState, useEffect, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import { listModels, modelContext, chat } from '../ollama/client.js'
import { loadConfig, setModel, setEffort, type Effort } from '../config.js'
import { homedir } from 'os'
import { WelcomeBlock } from './WelcomeBlock.js'
import { ModelList } from './ModelList.js'
import { InputBar } from './InputBar.js'
import { ModelsView } from './ModelsView.js'
import { CommandPalette, filteredCommands } from './CommandPalette.js'
import { ChatView } from './ChatView.js'
import type { ChatMessage } from './types.js'
import type { OllamaMessage } from '../ollama/types.js'

type AppState = 'loading' | 'select-model' | 'ready' | 'models'

const EFFORTS: Effort[] = ['low', 'medium', 'high']

export function App() {
  const { exit } = useApp()
  const cwd = process.cwd().replace(homedir(), '~')

  const [cfg, setCfg] = useState(loadConfig())
  const [models, setModels] = useState<string[]>([])
  const [contexts, setContexts] = useState<Record<string, number>>({})
  const [activeCtx, setActiveCtx] = useState<number | null>(null)
  const [state, setState] = useState<AppState>('loading')
  const [cursor, setCursor] = useState(0)
  const [input, setInput] = useState('')
  const [paletteCursor, setPaletteCursor] = useState(0)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [thinking, setThinking] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    listModels()
      .then((m) => {
        setModels(m)
        setState(cfg.model ? 'ready' : 'select-model')
        Promise.all(m.map((name) => modelContext(name).then((ctx) => [name, ctx] as const)))
          .then((pairs) => {
            const map = Object.fromEntries(pairs)
            setContexts(map)
            const active = cfg.model ?? m[0]
            if (active && map[active]) setActiveCtx(map[active])
          })
          .catch(() => {})
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        setModels([])
        setState(cfg.model ? 'ready' : 'select-model')
      })
  }, [])

  async function sendMessage(text: string) {
    if (busyRef.current || !cfg.model) return
    busyRef.current = true
    setError(null)

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setThinking(true)

    const history = [...messages, userMsg].map(
      (m): OllamaMessage => ({ role: m.role, content: m.content }),
    )

    let accumulated = ''
    let firstToken = true
    let promptTokens = 0
    let evalTokens = 0
    const startTime = Date.now()

    try {
      for await (const chunk of chat(cfg.model, history)) {
        if (firstToken && chunk.content) {
          firstToken = false
          setThinking(false)
          setStreaming(true)
        }
        if (chunk.content) {
          accumulated += chunk.content
          setStreamingContent(accumulated)
        }
        if (chunk.done) {
          promptTokens = chunk.prompt_eval_count ?? 0
          evalTokens = chunk.eval_count ?? 0
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setThinking(false)
      setStreaming(false)
      busyRef.current = false
      return
    }

    setStreaming(false)
    setStreamingContent('')
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: accumulated,
        tokens: { prompt_eval: promptTokens, eval: evalTokens },
        duration: Date.now() - startTime,
      },
    ])
    busyRef.current = false
  }

  useInput((char, key) => {
    if (key.ctrl && char === 'c') { exit(); return }

    if (state === 'select-model') {
      if (key.upArrow) setCursor((i) => Math.max(0, i - 1))
      else if (key.downArrow) setCursor((i) => Math.min(models.length - 1, i + 1))
      else if (key.return && models[cursor]) {
        const chosen = models[cursor]
        setModel(chosen)
        setCfg((c) => ({ ...c, model: chosen }))
        if (contexts[chosen]) setActiveCtx(contexts[chosen])
        setState('ready')
      }
      return
    }

    if (state === 'models') {
      if (key.upArrow) setCursor((i) => Math.max(0, i - 1))
      else if (key.downArrow) setCursor((i) => Math.min(models.length - 1, i + 1))
      else if (key.return && models[cursor]) {
        const chosen = models[cursor]
        setModel(chosen)
        setCfg((c) => ({ ...c, model: chosen }))
        if (contexts[chosen]) setActiveCtx(contexts[chosen])
        setState('ready')
      } else if (key.rightArrow) {
        const next = EFFORTS[Math.min(EFFORTS.indexOf(effort) + 1, EFFORTS.length - 1)]
        setEffort(next)
        setCfg((c) => ({ ...c, effort: next }))
      } else if (key.leftArrow) {
        const next = EFFORTS[Math.max(EFFORTS.indexOf(effort) - 1, 0)]
        setEffort(next)
        setCfg((c) => ({ ...c, effort: next }))
      } else if (key.escape) {
        setState('ready')
      }
      return
    }

    if (state === 'ready') {
      if (busyRef.current) return

      const paletteOpen = input.startsWith('/')
      const matches = paletteOpen ? filteredCommands(input) : []

      if (paletteOpen && key.upArrow) { setPaletteCursor((i) => Math.max(0, i - 1)); return }
      if (paletteOpen && key.downArrow) { setPaletteCursor((i) => Math.min(matches.length - 1, i + 1)); return }
      if (paletteOpen && key.tab && matches[paletteCursor]) {
        setInput(matches[paletteCursor].name)
        setPaletteCursor(0)
        return
      }
      if (paletteOpen && key.escape) { setInput(''); setPaletteCursor(0); return }

      if (key.return) {
        const trimmed = input.trim()
        if (trimmed === '/models') {
          setCursor(Math.max(0, models.findIndex((m) => m === cfg.model)))
          setState('models')
        } else if (trimmed === '/exit') {
          exit()
        } else if (trimmed) {
          sendMessage(trimmed)
        }
        setInput('')
        setPaletteCursor(0)
      } else if (key.backspace || key.delete) {
        setInput((s) => { setPaletteCursor(0); return s.slice(0, -1) })
      } else if (char && !key.ctrl && !key.meta && !key.tab) {
        setInput((s) => { setPaletteCursor(0); return s + char })
      }
    }
  })

  const effort: Effort = cfg.effort ?? 'medium'

  return (
    <Box flexDirection="column" paddingX={1}>
      <WelcomeBlock model={cfg.model} activeCtx={activeCtx} effort={effort} cwd={cwd} error={error} />

      {state === 'loading' && !error && (
        <Box marginLeft={2} marginBottom={1}>
          <Text dimColor>connecting to ollama…</Text>
        </Box>
      )}

      {error && state !== 'ready' && (
        <ChatView
          messages={[]}
          streaming={false}
          streamingContent=""
          thinking={false}
          error={error}
        />
      )}

      {state === 'select-model' && (
        <Box flexDirection="column" marginLeft={2}>
          <Text dimColor>no model configured — select one</Text>
          <Box marginTop={1}>
            <ModelList models={models} cursor={cursor} />
          </Box>
          {models.length > 0 && (
            <Box marginTop={1}>
              <Text dimColor>↑↓ navigate   enter select   ctrl+c quit</Text>
            </Box>
          )}
        </Box>
      )}

      {state === 'models' && (
        <ModelsView
          models={models}
          cursor={cursor}
          model={cfg.model}
          ollamaHost={cfg.ollamaHost}
          effort={effort}
        />
      )}

      {state === 'ready' && (
        <>
          <ChatView
            messages={messages}
            streaming={streaming}
            streamingContent={streamingContent}
            thinking={thinking}
            error={error}
          />
          {!error && input.startsWith('/') && (
            <CommandPalette filter={input} cursor={paletteCursor} />
          )}
          {!error && <InputBar input={input} />}
        </>
      )}
    </Box>
  )
}
