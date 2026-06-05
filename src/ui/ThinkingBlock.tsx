import { useState, useEffect } from 'react'
import { Box, Text } from 'ink'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function ThinkingBlock({ content }: { content?: string }) {
  const [frame, setFrame] = useState(0)

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
      {content ? (
        <Box marginLeft={2}>
          <Text dimColor italic>{content}</Text>
        </Box>
      ) : null}
    </Box>
  )
}
