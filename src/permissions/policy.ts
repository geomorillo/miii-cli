export type Decision = 'allow' | 'deny'
export type AskAnswer = 'yes' | 'no'

const DEFAULT_ALLOW = new Set<string>(['read_file'])

export type AskFn = (toolName: string, input: unknown) => Promise<AskAnswer>

export interface PermissionContext {
  ask: AskFn
}

export async function check(
  toolName: string,
  input: unknown,
  ctx: PermissionContext,
): Promise<Decision> {
  if (DEFAULT_ALLOW.has(toolName)) return 'allow'
  const answer = await ctx.ask(toolName, input)
  return answer === 'no' ? 'deny' : 'allow'
}
