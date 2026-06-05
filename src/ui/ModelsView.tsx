import { Box, Text } from 'ink'
import type { Effort } from '../config.js'
import { ModelList } from './ModelList.js'

interface Props {
  models: string[]
  cursor: number
  model: string | undefined
  ollamaHost: string | undefined
  effort: Effort
}

export function ModelsView({ models, cursor, model, ollamaHost, effort }: Props) {
  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>config</Text>
        <Box marginTop={1} flexDirection="column">
          <Text><Text dimColor>model   </Text><Text>{model ?? '—'}</Text></Text>
          <Text><Text dimColor>host    </Text><Text>{ollamaHost ?? 'http://localhost:11434'}</Text></Text>
          <Text>
            <Text dimColor>effort  </Text>
            <Text>{effort}</Text>
            <Text dimColor>  (← →)</Text>
          </Text>
        </Box>
      </Box>
      <Text dimColor>switch model</Text>
      <Box marginTop={1}>
        <ModelList models={models} cursor={cursor} activeModel={model} showActive />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate   enter switch   ←→ effort   esc close</Text>
      </Box>
    </Box>
  )
}
