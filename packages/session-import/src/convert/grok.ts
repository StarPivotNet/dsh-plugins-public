/** Grok Build updates.jsonl / chat_history.jsonl converter. */

import { convertConversation } from './events.ts'
import { asString, flattenText, isRecord, parseTime } from './text.ts'
import type {
  ConvertedSession,
  ConvertLimits,
  TranscriptConversation,
  TranscriptItem,
  TranscriptToolCall,
} from './types.ts'
import { DEFAULT_CONVERT_LIMITS } from './types.ts'

/** Convert one Grok Build session document. */
export function convertGrokSession(
  text: string,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
  summary?: GrokSummary,
): ConvertedSession {
  return convertConversation(extractGrokConversation(text, path, limits, summary), path, limits)
}

/** Fields read from Grok `summary.json`. */
export interface GrokSummary {
  readonly id?: string
  readonly cwd?: string
  readonly title?: string
  readonly model?: string
  readonly createdAt?: number
  readonly updatedAt?: number
}

/** Parse Grok summary.json into the fields the importer needs. */
export function parseGrokSummary(text: string): GrokSummary {
  let record: unknown
  try { record = JSON.parse(text) }
  catch { return {} }
  if (!isRecord(record)) return {}
  const info = isRecord(record.info) ? record.info : {}
  const created = Date.parse(String(record.created_at ?? ''))
  const updated = Date.parse(String(record.updated_at ?? record.last_active_at ?? ''))
  return {
    id: asString(info.id) ?? asString(record.id),
    cwd: asString(info.cwd) ?? asString(record.cwd),
    title: asString(record.generated_title) ?? asString(record.session_summary) ?? asString(record.title),
    model: asString(record.current_model_id) ?? asString(record.model),
    createdAt: Number.isFinite(created) ? created : undefined,
    updatedAt: Number.isFinite(updated) ? updated : undefined,
  }
}

/** Extract a Grok updates.jsonl or chat_history.jsonl file. */
export function extractGrokConversation(
  text: string,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
  summary: GrokSummary = {},
): TranscriptConversation {
  const items: TranscriptItem[] = []
  let nativeId = summary.id ?? idFromPath(path)
  let cwd = summary.cwd
  let createdAt = summary.createdAt ?? 0
  let updatedAt = summary.updatedAt ?? 0
  let model = summary.model
  let title = summary.title
  const pending = new Map<string, { name: string; args: string }>()

  for (const raw of text.split(/\r?\n/u)) {
    if (raw.trim().length === 0) continue
    let record: unknown
    try { record = JSON.parse(raw) }
    catch { continue }
    if (!isRecord(record)) continue
    const time = grokTime(record, updatedAt)
    if (time > updatedAt) updatedAt = time
    if (createdAt === 0 && time > 0) createdAt = time

    if (record.method === 'session/update' && isRecord(record.params) && isRecord(record.params.update)) {
      const update = record.params.update
      const kind = asString(update.sessionUpdate)
      if (typeof record.params.sessionId === 'string') nativeId = record.params.sessionId
      if (kind === 'user_message_chunk') {
        const textValue = chunkText(update.content, limits)
        if (textValue.length > 0) items.push({ kind: 'user', time, text: textValue, source: 'user' })
        continue
      }
      if (kind === 'agent_thought_chunk') {
        const textValue = chunkText(update.content, limits)
        if (textValue.length > 0) items.push({ kind: 'assistant', time, text: '', reasoning: textValue, toolCalls: [] })
        continue
      }
      if (kind === 'agent_message_chunk') {
        const textValue = chunkText(update.content, limits)
        if (textValue.length > 0) items.push({ kind: 'assistant', time, text: textValue, reasoning: '', toolCalls: [] })
        continue
      }
      if (kind === 'tool_call') {
        const callId = asString(update.toolCallId) ?? `grok-tool-${String(items.length)}`
        const name = asString(update.title) ?? asString(update.kind) ?? 'tool'
        const args = encodeGrokArgs(update.rawInput)
        pending.set(callId, { name, args })
        items.push({
          kind: 'assistant',
          time,
          text: '',
          reasoning: '',
          toolCalls: [{ callId, name, arguments: args }],
        })
        continue
      }
      if (kind === 'tool_call_update' && asString(update.status) === 'completed') {
        const callId = asString(update.toolCallId)
        if (callId === undefined) continue
        pending.delete(callId)
        items.push({
          kind: 'tool-result',
          time,
          callId,
          text: grokToolOutput(update.content, limits),
          isError: false,
        })
      }
      continue
    }

    const type = asString(record.type)
    if (type === 'user') {
      const textValue = flattenText(record.content, limits)
      const query = extractUserQuery(textValue)
      if (query.length > 0) items.push({ kind: 'user', time, text: query, source: 'user' })
      continue
    }
    if (type === 'assistant') {
      const toolCalls = grokHistoryToolCalls(record.tool_calls)
      items.push({
        kind: 'assistant',
        time,
        text: flattenText(record.content, limits),
        reasoning: '',
        toolCalls,
      })
      continue
    }
    if (type === 'reasoning') {
      const textValue = flattenText(record.summary ?? record.content, limits)
      if (textValue.length > 0) items.push({ kind: 'assistant', time, text: '', reasoning: textValue, toolCalls: [] })
      continue
    }
    if (type === 'tool_result') {
      const callId = asString(record.tool_call_id)
      if (callId === undefined) continue
      items.push({
        kind: 'tool-result',
        time,
        callId,
        text: flattenText(record.content, limits),
        isError: false,
      })
    }
  }

  return {
    source: 'grok',
    nativeId,
    title,
    cwd,
    createdAt: createdAt || updatedAt,
    updatedAt: updatedAt || createdAt,
    model,
    provider: 'xai',
    items,
  }
}

function grokTime(record: Record<string, unknown>, fallback: number): number {
  if (typeof record.timestamp === 'number') return parseTime(record.timestamp * (record.timestamp < 1e12 ? 1 : 1), fallback)
  if (isRecord(record.params) && isRecord(record.params.update) && isRecord(record.params.update._meta)) {
    return parseTime(record.params.update._meta.agentTimestampMs, fallback)
  }
  if (isRecord(record._meta)) return parseTime(record._meta.agentTimestampMs, fallback)
  return fallback
}

function chunkText(value: unknown, limits: ConvertLimits): string {
  if (isRecord(value)) return flattenText(value.text ?? value, limits)
  return flattenText(value, limits)
}

function grokToolOutput(value: unknown, limits: ConvertLimits): string {
  if (!Array.isArray(value)) return flattenText(value, limits)
  const parts: string[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    if (isRecord(item.content)) parts.push(flattenText(item.content.text ?? item.content, limits))
    else parts.push(flattenText(item, limits))
  }
  return parts.filter(part => part.length > 0).join('\n')
}

function grokHistoryToolCalls(value: unknown): readonly TranscriptToolCall[] {
  if (!Array.isArray(value)) return []
  const calls: TranscriptToolCall[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const callId = asString(item.id)
    const name = asString(item.name)
    if (callId === undefined || name === undefined) continue
    calls.push({ callId, name, arguments: encodeGrokArgs(item.arguments) })
  }
  return calls
}

function encodeGrokArgs(value: unknown): string {
  if (typeof value === 'string') return value
  try { return JSON.stringify(value ?? {}) }
  catch { return '{}' }
}

function extractUserQuery(text: string): string {
  const match = /<user_query>\s*([\s\S]*?)\s*<\/user_query>/u.exec(text)
  return (match?.[1] ?? text).trim()
}

function idFromPath(path: string): string {
  const parts = path.replace(/\\/gu, '/').split('/')
  const file = parts.at(-1) ?? 'session'
  if (file === 'updates.jsonl' || file === 'chat_history.jsonl') return parts.at(-2) ?? file
  return file.replace(/\.(jsonl|json)$/u, '')
}
