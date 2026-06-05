import { Box, Text } from 'ink'

interface Props {
  input: string
}

export function InputBar({ input }: Props) {
  return (
    <Box
      borderStyle="single"
      borderTop={true}
      borderBottom={true}
      borderLeft={false}
      borderRight={false}
      borderColor="white dim"
      paddingX={1}
      marginBottom={1}
    >
      <Text dimColor>{'> '}</Text>
      <Text>{input}</Text>
      <Text dimColor>▌</Text>
    </Box>
  )
}
