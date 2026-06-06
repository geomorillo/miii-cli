import { useState, useEffect } from 'react'
import { Box, Text } from 'ink'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

let globalThinkingVisible = false
const listeners = new Set<() => void>()

export function toggleThinkingVisible() {
  globalThinkingVisible = !globalThinkingVisible
  listeners.forEach((fn) => fn())
}

function useThinkingVisible() {
  const [visible, setVisible] = useState(globalThinkingVisible)

  useEffect(() => {
    const handler = () => setVisible(globalThinkingVisible)
    listeners.add(handler)
    return () => { listeners.delete(handler) }
  }, [])

  return visible
}

export function ThinkingBlock({ content }: { content?: string }) {
  const [frame, setFrame] = useState(0)
  const visible = useThinkingVisible()

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 80)
    return () => clearInterval(t)
  }, [])

  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      <Box>
        <Text color="blue">{FRAMES[frame]} </Text>
        <Text dimColor italic>thinking…</Text>
      </Box>
      {visible && content ? (
        <Box marginLeft={2}>
          <Text dimColor italic>{content}</Text>
        </Box>
      ) : null}
    </Box>
  )
}
