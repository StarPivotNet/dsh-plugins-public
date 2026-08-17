/** Codex rollout JSONL converter. */

import { convertConversation } from './events.ts'
import {
  asString, encodeArguments, flattenText, isInstructionDump, isRecord, parseTime,
} from './text.ts'
import type {
  ConvertedSession,
  ConvertLimits,
  TranscriptConversation,
  TranscriptItem,
  TranscriptToolCall,
} from './types.ts'
import { DEFAULT_CONVERT_LIMITS } from './types.ts'

/** Convert one Codex rollout JSONL document. */
export function convertCodexSession(
  text: string,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): ConvertedSession {
  return convertConversation(extractCodexConversation(text, path, limits), path, limits)
}

/** Extract a Codex rollout file into a source-neutral conversation. */
export function extractCodexConversation(
  text: string,
  path: string,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): TranscriptConversation {
  const items: TranscriptItem[] = []
  let nativeId = idFromPath(path)
  let cwd: string | undefined
  let createdAt = 0
  let updatedAt = 0
  let model: string | undefined
  let provider: string | undefined
  let title: string | undefined

  for (const raw of text.split(/\r?\n/u)) {
    if (raw.trim().length === 0) continue
    let record: unknown
    try { record = JSON.parse(raw) }
    catch { continue }
    if (!isRecord(record)) continue
    const time = parseTime(record.timestamp, updatedAt)
    if (time > updatedAt) updatedAt = time
    if (createdAt === 0 && time > 0) createdAt = time
    const type = asString(record.type)
    const payload = isRecord(record.payload) ? record.payload : record
    if (type === 'session_meta') {
      nativeId = asString(payload.id) ?? asString(payload.session_id) ?? nativeId
      cwd = asString(payload.cwd) ?? cwd
      model = asString(payload.model) ?? model
      provider = asString(payload.model_provider) ?? provider
      title = asString(payload.thread_name) ?? asString(payload.agent_nickname) ?? title
      continue
    }
    if (type === 'turn_context') {
      model = asString(payload.model) ?? model
      cwd = asString(payload.cwd) ?? cwd
      continue
    }
    if (type !== 'response_item') continue
    const item = extractResponseItem(payload, time, limits)
    if (item !== undefined) items.push(item)
  }

  return {
    source: 'codex',
    nativeId,
    title,
    cwd,
    createdAt: createdAt || updatedAt,
    updatedAt: updatedAt || createdAt,
    model,
    provider: provider ?? 'openai',
    items,
  }
}

/** Map one Codex response_item payload onto a transcript item. */
function extractResponseItem(
  payload: Record<string, unknown>,
  time: number,
  limits: ConvertLimits,
): TranscriptItem | undefined {
  const type = asString(payload.type)
  if (type === 'message') {
    const role = asString(payload.role)
    const text = flattenText(payload.content, limits)
    if (text.length === 0) return undefined
    if (role === 'assistant') {
      return {
        kind: 'assistant',
        id: asString(payload.id),
        time,
        text,
        reasoning: '',
        toolCalls: [],
      }
    }
    if (role === 'developer' || isInstructionDump(text)) {
      return {
        kind: 'user',
        id: asString(payload.id),
        time,
        text,
        source: 'plugin',
        plugin: 'codex',
        form: 'instructions',
      }
    }
    if (role === 'user' || role === undefined) {
      return {
        kind: 'user',
        id: asString(payload.id),
        time,
        text,
        source: 'user',
      }
    }
    return undefined
  }
  if (type === 'reasoning') {
    const text = flattenText(payload.summary ?? payload.content ?? payload.text, limits)
    if (text.length === 0) return undefined
    return {
      kind: 'assistant',
      id: asString(payload.id),
      time,
      text: '',
      reasoning: text,
      toolCalls: [],
    }
  }
  if (type === 'function_call' || type === 'custom_tool_call') {
    const callId = asString(payload.call_id) ?? asString(payload.id)
    const name = asString(payload.name)
    if (callId === undefined || name === undefined) return undefined
    const args = encodeArguments(payload.arguments ?? payload.input)
    const call: TranscriptToolCall = { callId, name, arguments: args }
    return {
      kind: 'assistant',
      id: asString(payload.id),
      time,
      text: '',
      reasoning: '',
      toolCalls: [call],
    }
  }
  if (type === 'function_call_output' || type === 'custom_tool_call_output') {
    const callId = asString(payload.call_id) ?? asString(payload.id)
    if (callId === undefined) return undefined
    return {
      kind: 'tool-result',
      time,
      callId,
      text: flattenText(payload.output ?? payload.content, limits),
      isError: payload.is_error === true || asString(payload.status) === 'failed',
    }
  }
  return undefined
}

/** Fall back to the rollout filename when metadata is missing. */
function idFromPath(path: string): string {
  const base = path.split(/[\\/]/u).at(-1) ?? 'session'
  return base.replace(/^rollout-/, '').replace(/\.jsonl$/u, '')
}
