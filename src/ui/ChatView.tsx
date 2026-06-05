import { Box, Text } from 'ink'
import { ThinkingBlock } from './ThinkingBlock.js'
import type { ChatMessage } from './types.js'

interface Props {
  messages: ChatMessage[]
  streaming: boolean
  streamingContent: string
  thinking: boolean
  error?: string | null
}

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row">
        <Text color="white">{'● '}</Text>
        <Box flexGrow={1}>
          <Text>{msg.content}</Text>
        </Box>
      </Box>
      {msg.tokens && (
        <Text dimColor>
          {`  ↳ ${msg.tokens.prompt_eval + msg.tokens.eval} tokens`}
          {msg.duration != null ? `  ${(msg.duration / 1000).toFixed(1)}s` : ''}
        </Text>
      )}
    </Box>
  )
}

export function ChatView({ messages, streaming, streamingContent, thinking, error }: Props) {
  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      {messages.map((msg, i) =>
        msg.role === 'user' ? (
          <Box key={i} marginBottom={1}>
            <Text color="blue">{'● '}</Text>
            <Text>{msg.content}</Text>
          </Box>
        ) : (
          <AssistantMessage key={i} msg={msg} />
        ),
      )}

      {thinking && <ThinkingBlock />}

      {streaming && streamingContent && (
        <Box flexDirection="row" marginBottom={1}>
          <Text color="white">{'● '}</Text>
          <Box flexGrow={1}>
            <Text>{streamingContent}</Text>
          </Box>
        </Box>
      )}

      {error && (
        <Box flexDirection="row" marginBottom={1}>
          <Text color="red">{'● '}</Text>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  )
}
