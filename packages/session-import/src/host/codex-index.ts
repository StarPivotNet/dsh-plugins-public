/** Read Codex sidebar titles from ~/.codex/session_index.jsonl. */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { asString, isRecord } from '../convert/text.ts'

/** Map a Codex thread id to the name shown in the Codex sidebar. */
export async function loadCodexThreadNames(home = homedir()): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  let text: string
  try { text = await readFile(join(home, '.codex', 'session_index.jsonl'), 'utf8') }
  catch { return names }
  for (const line of text.split(/\r?\n/u)) {
    if (line.trim().length === 0) continue
    let record: unknown
    try { record = JSON.parse(line) }
    catch { continue }
    if (!isRecord(record)) continue
    const id = asString(record.id)
    const title = asString(record.thread_name)
    if (id !== undefined && title !== undefined) names.set(id, title)
  }
  return names
}

/** Resolve a Codex title from the native id, session id, or parent thread. */
export function lookupCodexThreadName(
  names: Map<string, string>,
  ...ids: readonly (string | undefined)[]
): string | undefined {
  for (const id of ids) {
    if (id === undefined) continue
    const title = names.get(id)
    if (title !== undefined) return title
  }
  return undefined
}
