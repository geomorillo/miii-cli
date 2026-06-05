import { useState, useEffect, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import { listModels, modelContext } from '../ollama/client.js'
import { loadConfig, setModel, setEffort, type Effort } from '../config.js'
import { homedir } from 'os'
import { WelcomeBlock } from './WelcomeBlock.js'
import { ModelList } from './ModelList.js'
import { InputBar } from './InputBar.js'
import { ModelsView } from './ModelsView.js'
import { CommandPalette, filteredCommands } from './CommandPalette.js'
import { FilePicker, parseMention, searchFiles } from './FilePicker.js'
import { ChatView } from './ChatView.js'
import type { ChatMessage, PermissionRequest, ToolUseDisplay, ToolResultDisplay } from './types.js'
import { runAgent } from '../agent/loop.js'
import type { MiiMessage } from '../agent/types.js'

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
  const [filePickerCursor, setFilePickerCursor] = useState(0)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [thinking, setThinking] = useState(false)
  const [thinkingContent, setThinkingContent] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [processingLabel, setProcessingLabel] = useState<string | undefined>(undefined)

  const [agentHistory, setAgentHistory] = useState<MiiMessage[]>([])
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null)
  const [permissionCursor, setPermissionCursor] = useState(0)
  const [activeToolUses, setActiveToolUses] = useState<ToolUseDisplay[]>([])
  const [activeToolResults, setActiveToolResults] = useState<ToolResultDisplay[]>([])
  const pendingPermissionRef = useRef<PermissionRequest | null>(null)

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

  function askPermission(toolName: string, input: unknown): Promise<'yes' |'no'> {
    return new Promise((resolve) => {
      const req: PermissionRequest = { toolName, input, resolve }
      pendingPermissionRef.current = req
      setPermissionCursor(0)
      setPendingPermission(req)
    })
  }

  async function sendMessage(text: string) {
    if (busyRef.current || !cfg.model) return
    busyRef.current = true
    setBusy(true)
    setProcessingLabel('thinking…')
    setError(null)

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setThinking(true)

    let accumulated = ''
    let thinkingAcc = ''
    let firstToken = true
    setThinkingContent('')
    let turnUses: ToolUseDisplay[] = []
    let turnResults: ToolResultDisplay[] = []
    const startTime = Date.now()

    const flushTurn = (final: { prompt: number; eval: number } | null) => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: accumulated,
        tool_uses: turnUses.length ? turnUses : undefined,
        tool_results: turnResults.length ? turnResults : undefined,
      }
      if (final) {
        msg.tokens = { prompt_eval: final.prompt, eval: final.eval }
        msg.duration = Date.now() - startTime
      }
      setMessages((prev) => [...prev, msg])
      accumulated = ''
      turnUses = []
      turnResults = []
      setStreamingContent('')
      setActiveToolUses([])
      setActiveToolResults([])
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const gen = runAgent({
        model: cfg.model,
        cwd: process.cwd(),
        history: agentHistory,
        userText: text,
        permissions: { ask: askPermission },
        signal: controller.signal,
        num_ctx: activeCtx ?? undefined,
      })

      let finalTokens = { prompt: 0, eval: 0 }
      let result: IteratorResult<typeof gen extends AsyncGenerator<infer E, any> ? E : never, MiiMessage[]>
      // eslint-disable-next-line no-constant-condition
      while (true) {
        result = (await gen.next()) as typeof result
        if (result.done) {
          setAgentHistory(result.value)
          break
        }
        const ev = result.value
        switch (ev.type) {
          case 'text-delta': {
            if (firstToken) { firstToken = false; setStreaming(true) }
            setThinking(false)
            setProcessingLabel('responding…')
            accumulated += ev.text
            setStreamingContent(accumulated)
            break
          }
          case 'thinking-delta': {
            thinkingAcc += ev.text
            setThinkingContent(thinkingAcc)
            setThinking(true)
            setProcessingLabel('thinking…')
            break
          }
          case 'tool-use': {
            turnUses.push({ id: ev.block.id, name: ev.block.name, input: ev.block.input })
            setActiveToolUses([...turnUses])
            setProcessingLabel(`running ${ev.block.name}…`)
            break
          }
          case 'tool-result': {
            turnResults.push({
              tool_use_id: ev.block.tool_use_id,
              content: ev.block.content,
              is_error: ev.block.is_error,
            })
            setActiveToolResults([...turnResults])
            setProcessingLabel('thinking…')
            break
          }
          case 'turn-end': {
            setStreaming(false)
            if (ev.stop_reason === 'tool_use') {
              flushTurn(null)
              setThinking(true)
              thinkingAcc = ''
              setThinkingContent('')
              firstToken = true
            }
            break
          }
          case 'done': {
            finalTokens = { prompt: ev.prompt_tokens, eval: ev.eval_tokens }
            break
          }
          case 'aborted': {
            finalTokens = { prompt: ev.prompt_tokens, eval: ev.eval_tokens }
            setStreaming(false)
            setThinking(false)
            flushTurn(finalTokens)
            setError(`Aborted · ${ev.prompt_tokens + ev.eval_tokens} tokens · ${(ev.duration_ms / 1000).toFixed(1)}s`)
            break
          }
          case 'error': {
            setError(ev.message)
            break
          }
        }
      }

      setStreaming(false)
      setThinking(false)
      if (accumulated || turnUses.length || turnResults.length) {
        flushTurn(finalTokens)
      }
    } catch (err) {
      const aborted = controller.signal.aborted
      const msg = err instanceof Error ? err.message : String(err)
      setThinking(false)
      setStreaming(false)
      if (accumulated || turnUses.length || turnResults.length) {
        flushTurn(null)
      }
      if (aborted) {
        const dur = ((Date.now() - startTime) / 1000).toFixed(1)
        setError(`Aborted · ${dur}s`)
      } else {
        setError(msg)
      }
    }
    abortRef.current = null
    busyRef.current = false
    setBusy(false)
    setProcessingLabel(undefined)
  }

  useInput((char, key) => {
    if (key.ctrl && char === 'c') { exit(); return }

    if (key.escape && busyRef.current && abortRef.current) {
      abortRef.current.abort()
      return
    }

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

    if (state === 'ready' && pendingPermissionRef.current) {
      const req = pendingPermissionRef.current
      if (key.upArrow) { setPermissionCursor((i) => Math.max(0, i - 1)); return }
      if (key.downArrow) { setPermissionCursor((i) => Math.min(1, i + 1)); return }
      if (key.return) {
        const answers: Array<'yes' | 'no'> = ['yes', 'no']
        const choice = answers[permissionCursor]
        pendingPermissionRef.current = null
        setPendingPermission(null)
        req.resolve(choice)
        return
      }
      return
    }

    if (state === 'ready') {
      if (busyRef.current) return

      const paletteOpen = input.startsWith('/')
      const matches = paletteOpen ? filteredCommands(input) : []

      const mention = !paletteOpen ? parseMention(input) : null
      const fileMatches = mention ? searchFiles(process.cwd(), mention.query) : []
      const fileOpen = mention !== null && fileMatches.length > 0

      if (paletteOpen && key.upArrow) { setPaletteCursor((i) => Math.max(0, i - 1)); return }
      if (paletteOpen && key.downArrow) { setPaletteCursor((i) => Math.min(matches.length - 1, i + 1)); return }
      if (paletteOpen && (key.tab || key.return) && matches[paletteCursor] && input !== matches[paletteCursor].name) {
        setInput(matches[paletteCursor].name)
        setPaletteCursor(0)
        return
      }
      if (paletteOpen && key.escape) { setInput(''); setPaletteCursor(0); return }

      if (fileOpen && key.upArrow) { setFilePickerCursor((i) => Math.max(0, i - 1)); return }
      if (fileOpen && key.downArrow) { setFilePickerCursor((i) => Math.min(fileMatches.length - 1, i + 1)); return }
      if (fileOpen && key.tab && fileMatches[filePickerCursor]) {
        const picked = fileMatches[filePickerCursor]
        setInput(input.slice(0, mention!.start) + '@' + picked + ' ')
        setFilePickerCursor(0)
        return
      }
      if (fileOpen && key.escape) { setFilePickerCursor(0); return }

      if (key.return) {
        const trimmed = input.trim()
        if (trimmed === '/models') {
          setCursor(Math.max(0, models.findIndex((m) => m === cfg.model)))
          setState('models')
        } else if (trimmed === '/clear') {
          setMessages([])
          setAgentHistory([])
          setStreamingContent('')
          setThinkingContent('')
          setActiveToolUses([])
          setActiveToolResults([])
          setError(null)
        } else if (trimmed === '/exit') {
          exit()
        } else if (trimmed) {
          sendMessage(trimmed)
        }
        setInput('')
        setPaletteCursor(0)
      } else if (key.backspace || key.delete) {
        setInput((s) => { setPaletteCursor(0); setFilePickerCursor(0); return s.slice(0, -1) })
      } else if (char && !key.ctrl && !key.meta && !key.tab) {
        setInput((s) => { setPaletteCursor(0); setFilePickerCursor(0); return s + char })
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
            thinkingContent={thinkingContent}
            error={error}
            pendingPermission={pendingPermission}
            permissionCursor={permissionCursor}
            activeToolUses={activeToolUses}
            activeToolResults={activeToolResults}
          />
          {input.startsWith('/') && (
            <CommandPalette filter={input} cursor={paletteCursor} />
          )}
          {(() => {
            if (!activeCtx) return null
            const last = [...messages].reverse().find((m) => m.role === 'assistant' && m.tokens)
            const used = last?.tokens ? last.tokens.prompt_eval + last.tokens.eval : 0
            if (used < activeCtx * 0.7) return null
            const pct = Math.round((used / activeCtx) * 100)
            return (
              <Box marginLeft={2} marginBottom={1}>
                <Text color="yellow">{`⚠ context ${pct}% full (${used}/${activeCtx}) — run /clear and start fresh`}</Text>
              </Box>
            )
          })()}
          {!input.startsWith('/') && (() => {
            const m = parseMention(input)
            if (!m) return null
            const fm = searchFiles(process.cwd(), m.query)
            return <FilePicker matches={fm} cursor={filePickerCursor} />
          })()}
          <InputBar input={input} disabled={busy} processingLabel={processingLabel} />
        </>
      )}
    </Box>
  )
}
