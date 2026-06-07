import { Box, Text } from 'ink'

interface Props {
  models: string[]
  cursor: number
  activeModel?: string
  showActive?: boolean
}

export function ModelList({ models, cursor, activeModel, showActive }: Props) {
  if (models.length === 0) {
    return <Text dimColor>no models found. run: ollama pull {'<model>'}</Text>
  }
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      {models.map((m, i) => (
        <Text key={m} color={i === cursor ? 'blue' : undefined} dimColor={i !== cursor}>
          {i === cursor ? '❯ ' : '  '}{m}
          {showActive && m === activeModel ? <Text dimColor>  (active)</Text> : null}
        </Text>
      ))}
    </Box>
  )
}
