import { Box, Text } from 'ink'
import { ThinkingBlock } from './ThinkingBlock.js'
import type { ChatMessage, ToolUseDisplay, ToolResultDisplay, PermissionRequest } from './types.js'

interface Props {
  messages: ChatMessage[]
  streaming: boolean
  streamingContent: string
  thinking: boolean
  thinkingContent?: string
  error?: string | null
  pendingPermission?: PermissionRequest | null
  permissionCursor?: number
  activeToolUses?: ToolUseDisplay[]
  activeToolResults?: ToolResultDisplay[]
}

function formatTokens(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return String(n)
}

function formatDuration(ms: number): string {
  const totalSec = ms / 1000
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`
  const m = Math.floor(totalSec / 60)
  const s = Math.round(totalSec - m * 60)
  return `${m}m ${s}s`
}

function countLines(s: string): number {
  if (!s) return 0
  return s.split('\n').length
}

function FileEditBlock({
  label,
  path,
  added,
  removed,
  previewLines,
}: {
  label: string
  path: string
  added: number
  removed: number
  previewLines: Array<{ sign: '+' | '-' | ' '; text: string }>
}) {
  const MAX = 8
  const shown = previewLines.slice(0, MAX)
  const extra = previewLines.length - shown.length
  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box>
        <Text color="yellow">{'● '}</Text>
        <Text color="yellow">{label}</Text>
        <Text>{'('}</Text>
        <Text bold>{path}</Text>
        <Text>{')'}</Text>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>
          {'⎿  '}
          {removed > 0 ? `Added ${added} lines, removed ${removed} lines` : `Added ${added} lines`}
        </Text>
      </Box>
      {shown.map((ln, i) => (
        <Box key={i} marginLeft={4}>
          <Text color={ln.sign === '+' ? 'green' : ln.sign === '-' ? 'red' : undefined} dimColor={ln.sign === ' '}>
            {ln.sign} {ln.text}
          </Text>
        </Box>
      ))}
      {extra > 0 && (
        <Box marginLeft={4}>
          <Text dimColor>… {extra} more lines</Text>
        </Box>
      )}
    </Box>
  )
}

const TOOL_LABEL: Record<string, string> = {
  write_file: 'Write',
  edit_file: 'Update',
  read_file: 'Read',
  run_bash: 'Bash',
  glob: 'Glob',
  grep: 'Grep',
}

function toolHeader(use: ToolUseDisplay): { label: string; arg: string } {
  const label = TOOL_LABEL[use.name] ?? use.name
  const input = (use.input ?? {}) as Record<string, unknown>
  let arg = ''
  switch (use.name) {
    case 'write_file':
    case 'edit_file':
    case 'read_file':
      arg = String(input.path ?? input.file_path ?? '')
      break
    case 'run_bash':
      arg = String(input.command ?? '')
      break
    case 'glob':
    case 'grep':
      arg = String(input.pattern ?? '')
      break
    default: {
      const j = JSON.stringify(input)
      arg = j.length > 80 ? j.slice(0, 77) + '...' : j
    }
  }
  return { label, arg }
}

function summarizeResult(res: ToolResultDisplay): string {
  const lines = res.content.split('\n')
  const first = lines[0] ?? ''
  const extra = lines.length - 1
  const head = first.length > 100 ? first.slice(0, 97) + '...' : first
  return extra > 0 ? `${head} (+${extra} lines)` : head
}

function ToolUseLine({ use, result }: { use: ToolUseDisplay; result?: ToolResultDisplay }) {
  if (use.name === 'write_file') {
    const input = use.input as { path?: string; content?: string }
    const content = input.content ?? ''
    const added = countLines(content)
    const preview = content.split('\n').map((t) => ({ sign: '+' as const, text: t }))
    return <FileEditBlock label="Write" path={input.path ?? ''} added={added} removed={0} previewLines={preview} />
  }
  if (use.name === 'edit_file') {
    const input = use.input as { path?: string; old_str?: string; new_str?: string }
    const oldS = input.old_str ?? ''
    const newS = input.new_str ?? ''
    const added = countLines(newS)
    const removed = countLines(oldS)
    const preview: Array<{ sign: '+' | '-' | ' '; text: string }> = [
      ...oldS.split('\n').map((t) => ({ sign: '-' as const, text: t })),
      ...newS.split('\n').map((t) => ({ sign: '+' as const, text: t })),
    ]
    return <FileEditBlock label="Update" path={input.path ?? ''} added={added} removed={removed} previewLines={preview} />
  }
  const { label, arg } = toolHeader(use)
  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box>
        <Text color="yellow">{'● '}</Text>
        <Text color="yellow">{label}</Text>
        <Text>{'('}</Text>
        <Text bold>{arg}</Text>
        <Text>{')'}</Text>
      </Box>
      {result && (
        <Box marginLeft={2}>
          <Text color={result.is_error ? 'red' : undefined} dimColor={!result.is_error}>
            {'⎿  '}{summarizeResult(result)}
          </Text>
        </Box>
      )}
    </Box>
  )
}

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {msg.content && (
        <Box flexDirection="row">
          <Text color="white">{'● '}</Text>
          <Box flexGrow={1}>
            <Text>{msg.content}</Text>
          </Box>
        </Box>
      )}
      {msg.tool_uses?.map((u) => {
        const r = msg.tool_results?.find((x) => x.tool_use_id === u.id)
        return <ToolUseLine key={u.id} use={u} result={r} />
      })}
      {msg.tokens && (
        <Text dimColor>
          {`  ↳ Completed · ${formatTokens(msg.tokens.prompt_eval + msg.tokens.eval)} tokens`}
          {msg.duration != null ? ` · ${formatDuration(msg.duration)}` : ''}
        </Text>
      )}
    </Box>
  )
}

function summarizeInput(input: unknown): string {
  if (!input || typeof input !== 'object') return ''
  const obj = input as Record<string, unknown>
  const priority = ['path', 'file_path', 'command', 'pattern', 'query']
  for (const k of priority) {
    const v = obj[k]
    if (typeof v === 'string' && v.length > 0) return `${k}: ${v}`
  }
  const first = Object.entries(obj).find(([, v]) => typeof v === 'string') as
    | [string, string]
    | undefined
  if (first) {
    const [k, v] = first
    const trimmed = v.length > 80 ? v.slice(0, 80) + '…' : v
    return `${k}: ${trimmed}`
  }
  return ''
}

function PermissionPrompt({ req, cursor }: { req: PermissionRequest; cursor: number }) {
  const options: Array<{ label: string; key: 'yes' | 'no' }> = [
    { label: 'Yes', key: 'yes' },
    { label: 'No, and tell me what to do differently', key: 'no' },
  ]
  const summary = summarizeInput(req.input)
  return (
    <Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="blue" paddingX={1}>
      <Text color="blue" bold>Tool use</Text>
      <Box marginTop={1}>
        <Text>
          Allow <Text bold>{req.toolName}</Text>?
        </Text>
      </Box>
      {summary && (
        <Box marginLeft={2}>
          <Text dimColor>{summary}</Text>
        </Box>
      )}
      <Box flexDirection="column" marginTop={1}>
        {options.map((opt, i) => (
          <Text key={opt.key} color={i === cursor ? 'blue' : undefined}>
            {i === cursor ? '❯ ' : '  '}
            {i + 1}. {opt.label}
          </Text>
        ))}
      </Box>
    </Box>
  )
}

export function ChatView({
  messages,
  streaming,
  streamingContent,
  thinking,
  thinkingContent,
  error,
  pendingPermission,
  permissionCursor = 0,
  activeToolUses,
  activeToolResults,
}: Props) {
  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      {messages.map((msg, i) =>
        msg.role === 'user' ? (
          <Box key={i} flexDirection="row" marginBottom={1}>
            <Text color="blue">{'● '}</Text>
            <Box flexGrow={1}>
              <Text>{msg.content}</Text>
            </Box>
          </Box>
        ) : (
          <AssistantMessage key={i} msg={msg} />
        ),
      )}

      {thinking && <ThinkingBlock content={thinkingContent} />}

      {streaming && streamingContent && (
        <Box flexDirection="row" marginBottom={1}>
          <Text color="white">{'● '}</Text>
          <Box flexGrow={1}>
            <Text>{streamingContent}</Text>
          </Box>
        </Box>
      )}

      {activeToolUses?.map((u) => {
        const r = activeToolResults?.find((x) => x.tool_use_id === u.id)
        return <ToolUseLine key={u.id} use={u} result={r} />
      })}

      {pendingPermission && <PermissionPrompt req={pendingPermission} cursor={permissionCursor} />}

      {error && (
        <Box flexDirection="row" marginBottom={1}>
          <Text color="red">{'● '}</Text>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  )
}
