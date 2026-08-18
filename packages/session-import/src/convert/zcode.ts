/** ZCode sqlite / v2 session converter. */

import { DatabaseSync } from 'node:sqlite'
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

const SQLITE_PREFIX = 'zcode-sqlite://'

/** Convert one ZCode conversation from a v2 JSON document or a sqlite locator. */
export function convertZcodeSession(
  text: string,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): ConvertedSession {
  const locator = parseZcodeSqlitePath(path)
  const conversation = locator === undefined
    ? extractZcodeJson(text, path, limits)
    : extractZcodeSqlite(locator.db, locator.id, limits)
  return convertConversation(conversation, path, limits)
}

/** Virtual path that names one session row inside a ZCode sqlite database. */
export function zcodeSqlitePath(db: string, id: string): string {
  return SQLITE_PREFIX + db + '#' + id
}

/** Parse a `zcode-sqlite://<db>#<id>` locator. */
export function parseZcodeSqlitePath(path: string): { db: string; id: string } | undefined {
  if (!path.startsWith(SQLITE_PREFIX)) return undefined
  const hash = path.lastIndexOf('#')
  if (hash <= SQLITE_PREFIX.length) return undefined
  const db = path.slice(SQLITE_PREFIX.length, hash)
  const id = path.slice(hash + 1)
  if (db.length === 0 || id.length === 0) return undefined
  return { db, id }
}

/** Extract a ZCode v2 `{ meta, messages }` document. */
export function extractZcodeJson(
  text: string,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): TranscriptConversation {
  let record: unknown
  try { record = JSON.parse(text) }
  catch { record = undefined }
  const root = isRecord(record) ? record : {}
  const meta = isRecord(root.meta) ? root.meta : {}
  const messages = Array.isArray(root.messages) ? root.messages : []
  const items: TranscriptItem[] = []
  let createdAt = parseTime(meta.createdAt)
  let updatedAt = parseTime(meta.updatedAt, createdAt)
  for (const raw of messages) {
    if (!isRecord(raw)) continue
    const time = parseTime(raw.timestamp, updatedAt)
    if (createdAt === 0 && time > 0) createdAt = time
    if (time > updatedAt) updatedAt = time
    const role = asString(raw.role)
    const textValue = flattenText(raw.content, limits)
    if (role === 'user' && textValue.length > 0) {
      items.push({ kind: 'user', time, text: textValue, source: 'user' })
    } else if (role === 'assistant' && textValue.length > 0) {
      items.push({ kind: 'assistant', time, text: textValue, reasoning: '', toolCalls: [] })
    }
  }
  const nativeId = asString(meta.taskId) ?? fileStem(path)
  return {
    source: 'zcode',
    nativeId,
    title: asString(meta.title),
    cwd: asString(meta.workspacePath),
    createdAt: createdAt || updatedAt,
    updatedAt: updatedAt || createdAt,
    items,
  }
}

/** Extract one ZCode sqlite session, including text, reasoning, and tool parts. */
export function extractZcodeSqlite(
  dbPath: string,
  sessionId: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): TranscriptConversation {
  const db = new DatabaseSync(dbPath, { readOnly: true })
  try {
    const session = db.prepare(
      'SELECT id, directory, path, title, time_created, time_updated FROM session WHERE id = ?',
    ).get(sessionId) as ZcodeSessionRow | undefined
    if (session === undefined) throw new Error('zcode session not found: ' + sessionId)
    const messages = db.prepare(
      'SELECT id, data, sequence FROM message WHERE session_id = ? ORDER BY sequence, time_created',
    ).all(sessionId) as ZcodeMessageRow[]
    const parts = db.prepare(
      'SELECT message_id, data, sequence FROM part WHERE session_id = ? ORDER BY sequence, time_created',
    ).all(sessionId) as ZcodePartRow[]
    const partsByMessage = new Map<string, ZcodePartRow[]>()
    for (const part of parts) {
      const list = partsByMessage.get(part.message_id) ?? []
      list.push(part)
      partsByMessage.set(part.message_id, list)
    }
    const items: TranscriptItem[] = []
    for (const message of messages) {
      let data: unknown
      try { data = JSON.parse(message.data) }
      catch { continue }
      if (!isRecord(data)) continue
      const role = asString(data.role)
      const time = messageTime(data, Number(session.time_created))
      const attached = partsByMessage.get(message.id) ?? []
      if (role === 'user') {
        const text = partsText(attached, limits) || flattenText(data.content, limits)
        if (text.length > 0) items.push({ kind: 'user', id: message.id, time, text, source: 'user' })
        continue
      }
      if (role !== 'assistant') continue
      const reasoning = partsOfType(attached, 'reasoning', limits)
      const text = partsOfType(attached, 'text', limits)
      const toolCalls = toolCallsFromParts(attached, limits)
      if (text.length === 0 && reasoning.length === 0 && toolCalls.length === 0) continue
      items.push({
        kind: 'assistant',
        id: message.id,
        time,
        text,
        reasoning,
        toolCalls,
      })
      for (const call of toolCalls) {
        if (call.result === undefined) continue
        items.push({
          kind: 'tool-result',
          time: call.time,
          callId: call.callId,
          text: call.result,
          isError: call.isError === true,
        })
      }
    }
    return {
      source: 'zcode',
      nativeId: session.id,
      title: session.title || undefined,
      cwd: session.directory || session.path || undefined,
      createdAt: Number(session.time_created) || 0,
      updatedAt: Number(session.time_updated) || Number(session.time_created) || 0,
      items,
    }
  } finally {
    db.close()
  }
}

interface ZcodeSessionRow {
  id: string
  directory?: string
  path?: string
  title?: string
  time_created?: number
  time_updated?: number
}

interface ZcodeMessageRow {
  id: string
  data: string
  sequence: number
}

interface ZcodePartRow {
  message_id: string
  data: string
  sequence: number
}

interface ZcodeToolCall extends TranscriptToolCall {
  readonly time: number
  readonly result?: string
  readonly isError?: boolean
}

function partsText(parts: readonly ZcodePartRow[], limits: ConvertLimits): string {
  return partsOfType(parts, 'text', limits)
}

function partsOfType(parts: readonly ZcodePartRow[], type: string, limits: ConvertLimits): string {
  const chunks: string[] = []
  for (const part of parts) {
    const record = parsePart(part.data)
    if (record?.type !== type) continue
    const text = flattenText(record.text ?? record.content, limits)
    if (text.length > 0) chunks.push(text)
  }
  return chunks.join('\n')
}

function toolCallsFromParts(parts: readonly ZcodePartRow[], limits: ConvertLimits): ZcodeToolCall[] {
  const calls: ZcodeToolCall[] = []
  for (const part of parts) {
    const record = parsePart(part.data)
    if (record?.type !== 'tool') continue
    const callId = asString(record.callID) ?? asString(record.id)
    const name = asString(record.tool) ?? 'tool'
    if (callId === undefined) continue
    const state = isRecord(record.state) ? record.state : {}
    const status = asString(state.status)
    const output = state.output
    const result = output === undefined ? undefined : flattenText(output, limits)
    calls.push({
      callId,
      name,
      arguments: encodeArguments(state.input),
      time: partTime(record, 0),
      result,
      isError: status === 'error' || status === 'failed',
    })
  }
  return calls
}

function parsePart(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function messageTime(data: Record<string, unknown>, fallback: number): number {
  const time = isRecord(data.time) ? data.time : {}
  return parseTime(time.created ?? time.start ?? data.timestamp, fallback)
}

function partTime(data: Record<string, unknown>, fallback: number): number {
  const time = isRecord(data.time) ? data.time : {}
  return parseTime(time.end ?? time.start ?? time.created, fallback)
}

function fileStem(path: string): string {
  const base = path.replace(/\\/gu, '/').split('/').at(-1) ?? 'session'
  return base.replace(/\.(json|jsonl)$/u, '')
}
