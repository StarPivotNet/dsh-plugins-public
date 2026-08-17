/** Cursor composer / agent-transcript converter. */

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

/** Convert a Cursor composer JSON, JSONL, or agent-transcript document. */
export function convertCursorSession(
  text: string,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): ConvertedSession {
  return convertConversation(extractCursorConversation(text, path, limits), path, limits)
}

/** Extract Cursor composer bubbles or agent-transcript bubbles. */
export function extractCursorConversation(
  text: string,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): TranscriptConversation {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return extractCursorJson(JSON.parse(trimmed), path, limits)
    } catch {
      // Fall through to JSONL: a composer export may be one JSON object per line.
    }
  }
  return extractCursorJsonl(text, path, limits)
}

/** Extract a Cursor JSON object or array. */
function extractCursorJson(
  value: unknown,
  path: string,
  limits: ConvertLimits,
): TranscriptConversation {
  if (Array.isArray(value)) {
    return conversationFromItems(value.map(item => extractBubble(item, 0, limits)).filter(item => item !== undefined), path)
  }
  if (!isRecord(value)) {
    return conversationFromItems([], path)
  }
  const bubbles = firstArray(value, [
    'fullConversationHeadersOnly',
    'conversation',
    'messages',
    'bubbles',
    'composerId',
  ]) ?? firstArrayDeep(value)
  const items = (bubbles ?? []).map(item => extractBubble(item, parseTime(value.createdAt ?? value.created_at), limits))
    .filter((item): item is TranscriptItem => item !== undefined)
  const nativeId = asString(value.composerId)
    ?? asString(value.composer_id)
    ?? asString(value.id)
    ?? idFromPath(path)
  return {
    source: 'cursor',
    nativeId,
    title: asString(value.name) ?? asString(value.title) ?? asString(value.text),
    cwd: asString(value.cwd) ?? asString(value.workspaceUri),
    createdAt: parseTime(value.createdAt ?? value.created_at),
    updatedAt: parseTime(value.lastUpdatedAt ?? value.updatedAt ?? value.updated_at),
    model: asString(value.modelName) ?? asString(value.model),
    provider: 'cursor',
    items,
  }
}

/** Extract a Cursor JSONL agent transcript. */
function extractCursorJsonl(
  text: string,
  path: string,
  limits: ConvertLimits,
): TranscriptConversation {
  const items: TranscriptItem[] = []
  let nativeId = idFromPath(path)
  let title: string | undefined
  let cwd: string | undefined
  let createdAt = 0
  let updatedAt = 0
  for (const raw of text.split(/\r?\n/u)) {
    if (raw.trim().length === 0) continue
    let record: unknown
    try { record = JSON.parse(raw) }
    catch { continue }
    const time = isRecord(record) ? parseTime(record.timestamp ?? record.createdAt, updatedAt) : 0
    if (time > updatedAt) updatedAt = time
    if (createdAt === 0 && time > 0) createdAt = time
    if (isRecord(record)) {
      nativeId = asString(record.composerId) ?? asString(record.sessionId) ?? nativeId
      title = asString(record.title) ?? title
      cwd = asString(record.cwd) ?? cwd
    }
    const item = extractBubble(record, time, limits)
    if (item !== undefined) items.push(item)
  }
  return {
    source: 'cursor',
    nativeId,
    title,
    cwd,
    createdAt: createdAt || updatedAt,
    updatedAt: updatedAt || createdAt,
    provider: 'cursor',
    items,
  }
}

/** Map one Cursor bubble / chat message onto a transcript item. */
function extractBubble(
  value: unknown,
  fallbackTime: number,
  limits: ConvertLimits,
): TranscriptItem | undefined {
  if (!isRecord(value)) return undefined
  const time = parseTime(value.timestamp ?? value.createdAt ?? value.time, fallbackTime)
  const type = (asString(value.type) ?? asString(value.role) ?? '').toLowerCase()
  if (type === 'tool_result' || type === 'tool-result' || asString(value.toolCallId) !== undefined && type.includes('result')) {
    const callId = asString(value.toolCallId) ?? asString(value.tool_call_id) ?? asString(value.callId)
    if (callId === undefined) return undefined
    return {
      kind: 'tool-result',
      time,
      callId,
      text: flattenText(value.result ?? value.content ?? value.text, limits),
      isError: value.isError === true || value.is_error === true,
    }
  }
  if (type === 'ai' || type === 'assistant' || type === '1' || value.type === 2) {
    const toolCalls = extractCursorToolCalls(value)
    return {
      kind: 'assistant',
      id: asString(value.bubbleId) ?? asString(value.id),
      time,
      text: flattenText(value.text ?? value.content ?? value.richText, limits),
      reasoning: flattenText(value.thinking ?? value.reasoning, limits),
      model: asString(value.modelType) ?? asString(value.model),
      provider: 'cursor',
      toolCalls,
    }
  }
  if (type === 'user' || type === 'human' || type === '0' || value.type === 1 || asString(value.text) !== undefined) {
    const text = flattenText(value.text ?? value.content ?? value.richText, limits)
    if (text.length === 0) return undefined
    return {
      kind: 'user',
      id: asString(value.bubbleId) ?? asString(value.id),
      time,
      text,
      source: 'user',
    }
  }
  return undefined
}

/** Collect Cursor tool-call bubbles attached to an assistant message. */
function extractCursorToolCalls(value: Record<string, unknown>): TranscriptToolCall[] {
  const calls: TranscriptToolCall[] = []
  const raw = value.toolFormerData ?? value.toolCalls ?? value.tool_calls
  const list = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
  for (const item of list) {
    if (!isRecord(item)) continue
    const callId = asString(item.toolCallId) ?? asString(item.id) ?? asString(item.callId)
    const name = asString(item.name) ?? asString(item.toolName) ?? asString(item.tool)
    if (callId === undefined || name === undefined) continue
    calls.push({
      callId,
      name,
      arguments: encodeArguments(item.rawArgs ?? item.params ?? item.arguments ?? item.input),
    })
  }
  return calls
}

/** First named array field that exists on a Cursor document. */
function firstArray(value: Record<string, unknown>, keys: readonly string[]): unknown[] | undefined {
  for (const key of keys) {
    const field = value[key]
    if (Array.isArray(field)) return field
  }
  return undefined
}

/** Walk one level of nested objects looking for a conversation array. */
function firstArrayDeep(value: Record<string, unknown>): unknown[] | undefined {
  for (const nested of Object.values(value)) {
    if (!isRecord(nested)) continue
    const found = firstArray(nested, ['fullConversationHeadersOnly', 'conversation', 'messages', 'bubbles'])
    if (found !== undefined) return found
  }
  return undefined
}

function conversationFromItems(items: TranscriptItem[], path: string): TranscriptConversation {
  const first = items[0]?.time ?? 0
  const last = items.at(-1)?.time ?? first
  return {
    source: 'cursor',
    nativeId: idFromPath(path),
    createdAt: first,
    updatedAt: last,
    provider: 'cursor',
    items,
  }
}

function idFromPath(path: string): string {
  const base = path.split(/[\\/]/u).at(-1) ?? 'session'
  return base.replace(/\.(jsonl|json)$/u, '')
}
