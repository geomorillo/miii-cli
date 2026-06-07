import { Box, Text } from 'ink'
import type { SessionMeta } from '../session/store.js'

interface Props {
  sessions: SessionMeta[]
  cursor: number
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

export function SessionsView({ sessions, cursor }: Props) {
  return (
    <Box flexDirection="column" marginLeft={2}>
      <Text dimColor>resume session</Text>
      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        {sessions.length === 0 ? (
          <Text dimColor>no saved sessions yet</Text>
        ) : (
          sessions.map((s, i) => {
            const active = i === cursor
            const label = s.title
            return (
              <Box key={s.id} gap={1}>
                <Text color={active ? 'blue' : undefined} dimColor={!active}>
                  {active ? '❯ ' : '  '}{label}
                </Text>
                <Text dimColor>{`· ${s.messageCount} msgs · ${relativeTime(s.updatedAt)}`}</Text>
              </Box>
            )
          })
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate   enter resume   d delete   esc cancel</Text>
      </Box>
    </Box>
  )
}
