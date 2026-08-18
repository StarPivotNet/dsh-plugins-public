/** Claude Code project JSONL converter. */

import { convertConversation } from './events.ts'
import { asString, encodeArguments, flattenText, isRecord, parseTime } from './text.ts'
import type {
  ConvertedSession,
  ConvertLimits,
  TranscriptConversation,
  TranscriptItem,
  TranscriptToolCall,
} from './types.ts'
import { DEFAULT_CONVERT_LIMITS } from './types.ts'

/** Convert one Claude Code session JSONL document. */
export function convertClaudeSession(
  text: string,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): ConvertedSession {
  const conversation = extractClaudeConversation(text, path, limits)
  return convertConversation(conversation, path, limits)
}

/** Extract a Claude Code JSONL file into a source-neutral conversation. */
export function extractClaudeConversation(
  text: string,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): TranscriptConversation {
  const items: TranscriptItem[] = []
  let nativeId = idFromPath(path)
  let title: string | undefined
  let cwd: string | undefined
  let createdAt = 0
  let updatedAt = 0
  let model: string | undefined

  for (const raw of text.split(/\r?\n/u)) {
    if (raw.trim().length === 0) continue
    let record: unknown
    try { record = JSON.parse(raw) }
    catch { continue }
    if (!isRecord(record)) continue
    const type = asString(record.type)
    const time = parseTime(record.timestamp, updatedAt)
    if (time > updatedAt) updatedAt = time
    if (createdAt === 0 && time > 0) createdAt = time
    nativeId = asString(record.sessionId) ?? nativeId
    cwd = asString(record.cwd) ?? cwd
    if (type === 'ai-title') title = asString(record.aiTitle) ?? title
    if (type === 'assistant') {
      const message = isRecord(record.message) ? record.message : undefined
      model = asString(message?.model) ?? model
      const extracted = extractAssistant(message, time, limits)
      if (extracted !== undefined) items.push(extracted)
      continue
    }
    if (type === 'user') {
      const extracted = extractUser(record, time, limits)
      items.push(...extracted)
    }
  }

  return {
    source: 'claude',
    nativeId,
    title,
    cwd: cwd ?? cwdFromClaudeProjectPath(path),
    createdAt: createdAt || updatedAt,
    updatedAt: updatedAt || createdAt,
    model,
    provider: 'anthropic',
    items,
  }
}

/** Extract assistant text, reasoning, and tool calls from one Claude message. */
function extractAssistant(
  message: Record<string, unknown> | undefined,
  time: number,
  limits: ConvertLimits,
): TranscriptItem | undefined {
  if (message === undefined) return undefined
  const content = message.content
  const toolCalls: TranscriptToolCall[] = []
  const texts: string[] = []
  const reasoning: string[] = []
  if (Array.isArray(content)) {
    for (const block of content) {
      if (!isRecord(block)) continue
      const type = asString(block.type)
      if (type === 'tool_use') {
        const callId = asString(block.id)
        const name = asString(block.name)
        if (callId === undefined || name === undefined) continue
        toolCalls.push({ callId, name, arguments: encodeArguments(block.input) })
        continue
      }
      if (type === 'thinking') {
        const text = flattenText(block.thinking ?? block.text, limits)
        if (text.length > 0) reasoning.push(text)
        continue
      }
      if (type === 'text') {
        const text = flattenText(block.text, limits)
        if (text.length > 0) texts.push(text)
      }
    }
  } else {
    const text = flattenText(content, limits)
    if (text.length > 0) texts.push(text)
  }
  if (texts.length === 0 && reasoning.length === 0 && toolCalls.length === 0) return undefined
  return {
    kind: 'assistant',
    id: asString(message.id),
    time,
    text: texts.join('\n'),
    reasoning: reasoning.join('\n'),
    model: asString(message.model),
    provider: 'anthropic',
    toolCalls,
  }
}

/** Extract user text and tool results from one Claude user record. */
function extractUser(
  record: Record<string, unknown>,
  time: number,
  limits: ConvertLimits,
): TranscriptItem[] {
  const message = isRecord(record.message) ? record.message : undefined
  const content = message?.content ?? record.content
  const items: TranscriptItem[] = []
  if (Array.isArray(content)) {
    const texts: string[] = []
    for (const block of content) {
      if (!isRecord(block)) continue
      if (asString(block.type) === 'tool_result') {
        const callId = asString(block.tool_use_id) ?? asString(block.toolUseId)
        if (callId === undefined) continue
        items.push({
          kind: 'tool-result',
          time,
          callId,
          text: flattenText(block.content ?? block.text, limits),
          isError: block.is_error === true || block.isError === true,
        })
        continue
      }
      const text = flattenText(block, limits)
      if (text.length > 0) texts.push(text)
    }
    if (texts.length > 0) {
      items.push({
        kind: 'user',
        id: asString(record.uuid),
        time,
        text: texts.join('\n'),
        source: 'user',
      })
    }
    return items
  }
  const text = flattenText(content, limits)
  if (text.length === 0) return items
  items.push({
    kind: 'user',
    id: asString(record.uuid),
    time,
    text,
    source: 'user',
  })
  return items
}

/** Fall back to the JSONL basename when the file never recorded a session id. */
function idFromPath(path: string): string {
  const base = path.split(/[\\/]/u).at(-1) ?? 'session'
  return base.replace(/\.jsonl$/u, '')
}

/** Recover the project cwd from Claude's `~/.claude/projects/<encoded>` folder. */
export function cwdFromClaudeProjectPath(path: string): string | undefined {
  const parts = path.replace(/\\/gu, '/').split('/')
  const index = parts.lastIndexOf('projects')
  const slug = index === -1 ? undefined : parts[index + 1]
  if (slug === undefined || !slug.startsWith('-')) return undefined
  const recovered = slug.replace(/-/gu, '/')
  return recovered.length > 1 ? recovered : undefined
}
