/** Convert a discovered foreign session and persist it as a cold DSH session. */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { convertClaudeSession } from '../convert/claude.ts'
import { convertCodexSession } from '../convert/codex.ts'
import { loadCodexThreadNames, lookupCodexThreadName } from './codex-index.ts'
import { convertCursorSession } from '../convert/cursor.ts'
import { convertGrokSession, parseGrokSummary } from '../convert/grok.ts'
import { convertZcodeSession } from '../convert/zcode.ts'
import { detectSource } from '../convert/detect.ts'
import type {
  ConvertedSession,
  ConvertLimits,
  DiscoveredSession,
  ImportSource,
} from '../convert/types.ts'
import { DEFAULT_CONVERT_LIMITS } from '../convert/types.ts'

/** Persistence face used by the importer. */
export interface PersistenceHandle {
  create(meta: ConvertedSession['header']): Promise<void>
  append(id: string, events: ConvertedSession['events']): Promise<void>
}

/** Outcome of one session import. */
export type ImportOutcome =
  | { readonly ok: true; readonly converted: ConvertedSession; readonly alreadyImported: boolean }
  | { readonly ok: false; readonly path: string; readonly message: string }

/** Convert one file from disk. */
export async function convertFile(
  path: string,
  source: ImportSource | undefined,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): Promise<ConvertedSession> {
  const detectedHint = source ?? detectSource(path, '')
  if (detectedHint === 'zcode' && path.startsWith('zcode-sqlite://')) {
    return convertZcodeSession('', path, limits)
  }
  const text = await readFile(path, 'utf8')
  const detected = source ?? detectSource(path, text)
  if (detected === undefined) {
    throw new Error(`cannot detect conversation format: ${path}`)
  }
  if (detected === 'claude') return convertClaudeSession(text, path, limits)
  if (detected === 'codex') {
    const names = await loadCodexThreadNames()
    const meta = firstCodexMeta(text)
    return convertCodexSession(
      text,
      path,
      limits,
      lookupCodexThreadName(names, meta.id, meta.sessionId, meta.parentId),
    )
  }
  if (detected === 'grok') {
    let summary
    try { summary = parseGrokSummary(await readFile(join(dirname(path), 'summary.json'), 'utf8')) }
    catch { summary = undefined }
    return convertGrokSession(text, path, limits, summary)
  }
  if (detected === 'zcode') return convertZcodeSession(text, path, limits)
  return convertCursorSession(text, path, limits)
}

function firstCodexMeta(text: string): { id?: string; sessionId?: string; parentId?: string } {
  for (const line of text.split(/\r?\n/u).slice(0, 20)) {
    if (line.trim().length === 0) continue
    let record: unknown
    try { record = JSON.parse(line) }
    catch { continue }
    if (record === null || typeof record !== 'object' || Array.isArray(record)) continue
    const row = record as Record<string, unknown>
    if (row.type !== 'session_meta') continue
    const payload = row.payload !== null && typeof row.payload === 'object' && !Array.isArray(row.payload)
      ? row.payload as Record<string, unknown>
      : row
    return {
      id: typeof payload.id === 'string' ? payload.id : undefined,
      sessionId: typeof payload.session_id === 'string' ? payload.session_id : undefined,
      parentId: typeof payload.parent_thread_id === 'string'
        ? payload.parent_thread_id
        : typeof payload.forked_from_id === 'string' ? payload.forked_from_id : undefined,
    }
  }
  return {}
}

/** Persist a converted conversation, skipping ids that already exist. */
/** Stamp a workspace cwd onto a converted session so it appears in that project's list. */
export function withWorkspaceCwd(converted: ConvertedSession, cwd: string | undefined): ConvertedSession {
  if (cwd === undefined || cwd.length === 0) return converted
  return { ...converted, header: { ...converted.header, cwd } }
}

/** Persist a converted conversation, skipping ids that already exist. */
export async function persistConverted(
  persistence: PersistenceHandle,
  converted: ConvertedSession,
): Promise<ImportOutcome> {
  try {
    await persistence.create(converted.header)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/already/i.test(message)) {
      return { ok: true, converted, alreadyImported: true }
    }
    return { ok: false, path: converted.path, message }
  }
  try {
    await persistence.append(converted.header.id, converted.events)
    return { ok: true, converted, alreadyImported: false }
  } catch (error) {
    return {
      ok: false,
      path: converted.path,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

/** Convert and persist one discovered row. */
export async function importDiscovered(
  persistence: PersistenceHandle,
  row: DiscoveredSession,
  limits: ConvertLimits = DEFAULT_CONVERT_LIMITS,
): Promise<ImportOutcome> {
  try {
    const converted = await convertFile(row.path, row.source, limits)
    return persistConverted(persistence, converted)
  } catch (error) {
    return {
      ok: false,
      path: row.path,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
