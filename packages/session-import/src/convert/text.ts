/** Text extraction and truncation for foreign transcripts. */

import type { ConvertLimits } from './types.ts'
import { DEFAULT_CONVERT_LIMITS } from './types.ts'

/** Return whether a value is a plain object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Read a string field when present. */
export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Parse a foreign timestamp into epoch milliseconds. */
export function parseTime(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? Math.round(value * 1000) : Math.round(value)
  }
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return Math.round(fallback)
}

/** Persistable epoch milliseconds for a DSH session header or event. */
export function epochMs(value: number, fallback = Date.now()): number {
  const rounded = Math.round(value)
  return Number.isSafeInteger(rounded) && rounded >= 0 ? rounded : Math.round(fallback)
}

/** Truncate text to a character budget without splitting a surrogate pair. */
export function truncateChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  if (maxChars <= 1) return '…'
  let end = maxChars - 1
  const unit = text.charCodeAt(end - 1)
  if (unit >= 0xD800 && unit <= 0xDBFF) end -= 1
  return `${text.slice(0, end)}…`
}

/** Flatten mixed foreign content values into one text string. */
export function flattenText(value: unknown, limits: ConvertLimits = DEFAULT_CONVERT_LIMITS): string {
  const parts: string[] = []
  collectText(value, parts)
  return truncateChars(parts.join('\n'), limits.maxTextChars)
}

/** Collect visible text from a foreign content tree. */
function collectText(value: unknown, parts: string[]): void {
  if (typeof value === 'string') {
    if (value.length > 0) parts.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, parts)
    return
  }
  if (!isRecord(value)) return
  const type = asString(value.type)
  if (type === 'tool_use' || type === 'tool-call' || type === 'function_call' || type === 'custom_tool_call') {
    return
  }
  const direct = asString(value.text)
    ?? asString(value.content)
    ?? asString(value.thinking)
    ?? asString(value.output)
    ?? asString(value.message)
  if (direct !== undefined) {
    parts.push(direct)
    return
  }
  if (Array.isArray(value.content)) collectText(value.content, parts)
  if (Array.isArray(value.summary)) collectText(value.summary, parts)
}

/** JSON-stringify tool arguments, preserving an already-encoded string. */
export function encodeArguments(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value ?? {})
  } catch {
    return '{}'
  }
}

/** Whether a user blob is an injected instruction dump rather than a human prompt. */
export function isInstructionDump(text: string): boolean {
  const head = text.trimStart()
  return head.startsWith('# AGENTS.md')
    || head.startsWith('<INSTRUCTIONS>')
    || head.startsWith('# Claude Code')
}

/** First non-empty line suitable as a fallback title. */
export function fallbackTitle(text: string, maxChars = 80): string {
  const line = text.replace(/\s+/gu, ' ').trim()
  return line.length === 0 ? 'Imported session' : truncateChars(line, maxChars)
}

/** Collapse a skill or command name into kebab-case. */
export function kebabName(raw: string): string | undefined {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/u, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : undefined
}
