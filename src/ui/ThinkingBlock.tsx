import { useState, useEffect } from 'react'
import { Box, Text } from 'ink'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function ThinkingBlock() {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 80)
    return () => clearInterval(t)
  }, [])

  return (
    <Box marginLeft={2} marginBottom={1}>
      <Text color="blue">{FRAMES[frame]} </Text>
      <Text dimColor>thinking…</Text>
    </Box>
  )
}
