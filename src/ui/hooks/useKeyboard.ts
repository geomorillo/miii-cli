/**
 * useKeyboard — wires all keyboard input for the App.
 *
 * Centralises key routing so App.tsx stays declarative.
 * Depends on refs/setters passed in from App state.
 */
import { useInput } from 'ink'
import { setModel, setEffort, type Effort } from '../../config.js'
import { filteredCommands } from '../CommandPalette.js'
import { parseMention, searchFiles } from '../FilePicker.js'
import { toggleThinkingVisible } from '../ThinkingBlock.js'
import type { MiiMessage } from '../../agent/types.js'
import type { PermissionRequest } from '../types.js'

const EFFORTS: Effort[] = ['low', 'medium', 'high']

interface KeyboardOptions {
  exit: () => void
  state: string
  setState: (s: any) => void

  // model selection
  models: string[]
  cursor: number
  setCursor: (fn: (i: number) => number) => void
  contexts: Record<string, number>
  cfg: { model?: string; effort?: Effort }
  setCfg: (fn: (c: any) => any) => void
  setActiveCtx: (n: number) => void

  // permission prompt
  pendingPermissionRef: React.MutableRefObject<PermissionRequest | null>
  permissionCursor: number
  setPermissionCursor: (fn: (i: number) => number) => void
  resolvePermission: (cursor: number) => void

  // busy / abort
  busyRef: React.MutableRefObject<boolean>
  abortRef: React.MutableRefObject<AbortController | null>

  // input bar
  input: string
  setInput: (fn: (s: string) => string) => void
  paletteCursor: number
  setPaletteCursor: (fn: (i: number) => number) => void
  filePickerCursor: number
  setFilePickerCursor: (fn: (i: number) => number) => void

  // chat actions
  sendMessage: (text: string) => void
  setMessages: (fn: (m: any[]) => any[]) => void
  setAgentHistory: (h: MiiMessage[]) => void
  setStreamingContent: (s: string) => void
  setThinkingContent: (s: string) => void
  setActiveToolUses: (a: any[]) => void
  setActiveToolResults: (a: any[]) => void
  setError: (e: string | null) => void
}

export function useKeyboard(opts: KeyboardOptions) {
  const {
    exit, state, setState,
    models, cursor, setCursor, contexts, cfg, setCfg, setActiveCtx,
    pendingPermissionRef, permissionCursor, setPermissionCursor, resolvePermission,
    busyRef, abortRef,
    input, setInput, paletteCursor, setPaletteCursor, filePickerCursor, setFilePickerCursor,
    sendMessage, setMessages, setAgentHistory, setStreamingContent, setThinkingContent,
    setActiveToolUses, setActiveToolResults, setError,
  } = opts

  const effort: Effort = cfg.effort ?? 'medium'

  useInput((char, key) => {
    // --- global shortcuts ---
    if (key.ctrl && char === 'c') { exit(); return }
    // Ctrl+T toggles thinking block content visibility
    if (key.ctrl && char === 't') { toggleThinkingVisible(); return }

    if (key.escape && busyRef.current && abortRef.current) {
      abortRef.current.abort()
      return
    }

    // --- model selection screen (initial pick or /models) ---
    if (state === 'select-model' || state === 'models') {
      if (key.upArrow) { setCursor((i) => Math.max(0, i - 1)); return }
      if (key.downArrow) { setCursor((i) => Math.min(models.length - 1, i + 1)); return }
      if (key.return && models[cursor]) {
        const chosen = models[cursor]
        setModel(chosen)
        setCfg((c) => ({ ...c, model: chosen }))
        if (contexts[chosen]) setActiveCtx(contexts[chosen])
        setState('ready')
        return
      }
      // effort adjustment only on /models screen
      if (state === 'models') {
        if (key.rightArrow) {
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
      }
      return
    }

    // --- permission prompt overlay ---
    if (state === 'ready' && pendingPermissionRef.current) {
      if (key.upArrow) { setPermissionCursor((i) => Math.max(0, i - 1)); return }
      if (key.downArrow) { setPermissionCursor((i) => Math.min(1, i + 1)); return }
      if (key.return) { resolvePermission(permissionCursor); return }
      return
    }

    // --- main chat input ---
    if (state === 'ready') {
      if (busyRef.current) return

      const paletteOpen = input.startsWith('/')
      const matches = paletteOpen ? filteredCommands(input) : []
      const mention = !paletteOpen ? parseMention(input) : null
      const fileMatches = mention ? searchFiles(process.cwd(), mention.query) : []
      const fileOpen = mention !== null && fileMatches.length > 0

      // command palette navigation
      if (paletteOpen && key.upArrow) { setPaletteCursor((i) => Math.max(0, i - 1)); return }
      if (paletteOpen && key.downArrow) { setPaletteCursor((i) => Math.min(matches.length - 1, i + 1)); return }
      if (paletteOpen && (key.tab || key.return) && matches[paletteCursor] && input !== matches[paletteCursor].name) {
        setInput(() => matches[paletteCursor].name)
        setPaletteCursor(() => 0)
        return
      }
      if (paletteOpen && key.escape) { setInput(() => ''); setPaletteCursor(() => 0); return }

      // file picker navigation
      if (fileOpen && key.upArrow) { setFilePickerCursor((i) => Math.max(0, i - 1)); return }
      if (fileOpen && key.downArrow) { setFilePickerCursor((i) => Math.min(fileMatches.length - 1, i + 1)); return }
      if (fileOpen && key.tab && fileMatches[filePickerCursor]) {
        const picked = fileMatches[filePickerCursor]
        setInput((s) => s.slice(0, mention!.start) + '@' + picked + ' ')
        setFilePickerCursor(() => 0)
        return
      }
      if (fileOpen && key.escape) { setFilePickerCursor(() => 0); return }

      // submit / built-in commands
      if (key.return) {
        const trimmed = input.trim()
        if (trimmed === '/models') {
          setCursor(() => Math.max(0, models.findIndex((m) => m === cfg.model)))
          setState('models')
        } else if (trimmed === '/clear') {
          setMessages(() => [])
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
        setInput(() => '')
        setPaletteCursor(() => 0)
        return
      }

      // text editing
      if (key.backspace || key.delete) {
        setInput((s) => { setPaletteCursor(() => 0); setFilePickerCursor(() => 0); return s.slice(0, -1) })
      } else if (char && !key.ctrl && !key.meta && !key.tab) {
        setInput((s) => { setPaletteCursor(() => 0); setFilePickerCursor(() => 0); return s + char })
      }
    }
  })
}
