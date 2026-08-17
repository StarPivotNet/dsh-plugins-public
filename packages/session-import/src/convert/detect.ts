/** Detect which foreign store a file belongs to. */

import { asString, isRecord } from './text.ts'
import type { ImportSource } from './types.ts'

/** Guess a converter from path and the first JSON record. */
export function detectSource(path: string, text: string): ImportSource | undefined {
  const normalized = path.replace(/\\/gu, '/')
  if (normalized.includes('/.claude/projects/') || normalized.includes('/.claude/sessions/')) return 'claude'
  if (normalized.includes('/.codex/sessions/') || /rollout-.*\.jsonl$/u.test(normalized)) return 'codex'
  if (normalized.includes('/.cursor/') || normalized.includes('/User/workspaceStorage/') || normalized.includes('/Cursor/')) {
    return 'cursor'
  }
  const first = firstRecord(text)
  if (first === undefined) return undefined
  if (asString(first.sessionId) !== undefined && (first.type === 'user' || first.type === 'assistant' || first.type === 'mode')) {
    return 'claude'
  }
  if (first.type === 'session_meta' || first.type === 'response_item' || first.type === 'event_msg') return 'codex'
  if (asString(first.composerId) !== undefined || asString(first.bubbleId) !== undefined) return 'cursor'
  if (Array.isArray(first.fullConversationHeadersOnly) || Array.isArray(first.bubbles)) return 'cursor'
  return undefined
}

/** Parse the first JSON object from a JSON or JSONL document. */
function firstRecord(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed.split(/\r?\n/u)[0] ?? trimmed)
      return isRecord(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }
  for (const line of trimmed.split(/\r?\n/u)) {
    if (line.trim().length === 0) continue
    try {
      const parsed: unknown = JSON.parse(line)
      return isRecord(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }
  return undefined
}
