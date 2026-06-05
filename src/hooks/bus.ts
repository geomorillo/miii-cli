import type { ToolUse, ToolResultBlock } from '../agent/types.js'

export type PreToolHook = (use: ToolUse) => void | Promise<void>
export type PostToolHook = (use: ToolUse, result: ToolResultBlock) => void | Promise<void>

export class HookBus {
  private pre: PreToolHook[] = []
  private post: PostToolHook[] = []

  onPreTool(fn: PreToolHook): void { this.pre.push(fn) }
  onPostTool(fn: PostToolHook): void { this.post.push(fn) }

  async firePre(use: ToolUse): Promise<void> {
    for (const fn of this.pre) await fn(use)
  }
  async firePost(use: ToolUse, result: ToolResultBlock): Promise<void> {
    for (const fn of this.post) await fn(use, result)
  }
}
