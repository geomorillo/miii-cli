import { Box, Text } from 'ink'

export interface Command {
  name: string
  description: string
}

export const COMMANDS: Command[] = [
  { name: '/models', description: 'switch model or adjust effort' },
  { name: '/clear',  description: 'clear chat and reset context' },
  { name: '/exit',   description: 'quit miii' },
]

interface Props {
  filter: string
  cursor: number
}

export function CommandPalette({ filter, cursor }: Props) {
  const filtered = COMMANDS.filter((c) => c.name.startsWith(filter))
  if (filtered.length === 0) return null

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      marginX={1}
      marginBottom={0}
      paddingX={1}
    >
      {filtered.map((cmd, i) => {
        const active = i === cursor
        return (
          <Box key={cmd.name} gap={1}>
            <Text bold={active} color={active ? 'blue' : undefined} dimColor={!active}>
              {active ? '❯ ' : '  '}{cmd.name}
            </Text>
            <Text dimColor>{cmd.description}</Text>
          </Box>
        )
      })}
      <Box marginTop={0}>
        <Text dimColor>↑↓ navigate   tab/enter autocomplete   esc dismiss</Text>
      </Box>
    </Box>
  )
}

export function filteredCommands(filter: string): Command[] {
  return COMMANDS.filter((c) => c.name.startsWith(filter))
}
