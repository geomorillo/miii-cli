import { Box, Text } from 'ink'
import type { Effort } from '../config.js'

const EFFORTS: Effort[] = ['low', 'medium', 'high']

function fmtCtx(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return `${n}`
}

interface Props {
  model: string | undefined
  activeCtx: number | null
  effort: Effort
  cwd: string
  error?: string | null
}

export function WelcomeBlock({ model, activeCtx, effort, cwd, error }: Props) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={3}
      paddingY={1}
      marginBottom={1}
      minWidth={48}
    >
      <Box flexDirection="column" gap={1} marginBottom={1}>
        <Text bold color="blue">MIII CLI</Text>
        <Text dimColor>{cwd}</Text>
      </Box>

      <Text dimColor>{'─'.repeat(40)}</Text>

      {!error && model ? (
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Box gap={2}>
            <Text dimColor>model</Text>
            <Text>{model}</Text>
          </Box>
          <Box gap={2}>
            <Text dimColor>ctx  </Text>
            <Text dimColor={!activeCtx}>
              {activeCtx ? `${fmtCtx(activeCtx)} tokens` : '…'}
            </Text>
          </Box>
          <Box gap={2}>
            <Text dimColor>efrt </Text>
            <Text color={effort === 'high' ? 'yellow' : effort === 'medium' ? 'green' : 'blue'}>
              {'●'.repeat(EFFORTS.indexOf(effort) + 1)}{'○'.repeat(EFFORTS.length - EFFORTS.indexOf(effort) - 1)}
            </Text>
            <Text color={effort === 'high' ? 'yellow' : effort === 'medium' ? 'green' : 'blue'}>{effort}</Text>
          </Box>
        </Box>
      ) : !error ? (
        <Box marginTop={1}>
          <Text dimColor>no model — run </Text>
          <Text>/models</Text>
        </Box>
      ) : null}
    </Box>
  )
}
