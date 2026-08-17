/** Convert a discovered foreign session and persist it as a cold DSH session. */

import { readFile } from 'node:fs/promises'
import { convertClaudeSession } from '../convert/claude.ts'
import { convertCodexSession } from '../convert/codex.ts'
import { convertCursorSession } from '../convert/cursor.ts'
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
  const text = await readFile(path, 'utf8')
  const detected = source ?? detectSource(path, text)
  if (detected === undefined) {
    throw new Error(`cannot detect conversation format: ${path}`)
  }
  if (detected === 'claude') return convertClaudeSession(text, path, limits)
  if (detected === 'codex') return convertCodexSession(text, path, limits)
  return convertCursorSession(text, path, limits)
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
