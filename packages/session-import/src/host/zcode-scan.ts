/** Discover ZCode conversations from the local sqlite store and v2 JSON files. */

import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { readdir, stat } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import type { DiscoveredSession } from '../convert/types.ts'
import { fallbackTitle } from '../convert/text.ts'
import { parseZcodeSqlitePath, zcodeSqlitePath } from '../convert/zcode.ts'

/** Default ZCode data locations on this machine. */
export function defaultZcodeRoots(home = homedir()): readonly string[] {
  return [
    join(home, '.zcode', 'cli', 'db', 'db.sqlite'),
    join(home, '.zcode', 'v2', 'sessions'),
    join('/Volumes/ExternalData/zcode/.zcode/v2/sessions'),
  ]
}

/** List ZCode sqlite sessions and v2 JSON conversations. */
export async function discoverZcodeSessions(
  extraRoots?: readonly string[],
  signal?: AbortSignal,
): Promise<DiscoveredSession[]> {
  const roots = extraRoots ?? defaultZcodeRoots()
  const found: DiscoveredSession[] = []
  const seen = new Set<string>()
  for (const root of roots) {
    signal?.throwIfAborted()
    if (root.endsWith('.sqlite') || root.endsWith('.db')) {
      for (const row of listSqliteSessions(root)) {
        if (seen.has(row.path)) continue
        seen.add(row.path)
        found.push(row)
      }
      continue
    }
    for (const row of await listJsonSessions(root, 4, signal)) {
      if (seen.has(row.path)) continue
      seen.add(row.path)
      found.push(row)
    }
  }
  found.sort((left, right) => right.updatedAt - left.updatedAt || left.path.localeCompare(right.path))
  return found
}

function listSqliteSessions(dbPath: string): DiscoveredSession[] {
  let db: DatabaseSync
  try { db = new DatabaseSync(dbPath, { readOnly: true }) }
  catch { return [] }
  try {
    const rows = db.prepare(
      'SELECT id, directory, path, title, time_created, time_updated, parent_id FROM session WHERE parent_id IS NULL',
    ).all() as {
      id: string
      directory?: string
      path?: string
      title?: string
      time_created?: number
      time_updated?: number
    }[]
    return rows.map((row) => {
      const createdAt = Number(row.time_created) || 0
      const updatedAt = Number(row.time_updated) || createdAt
      return {
        source: 'zcode' as const,
        nativeId: row.id,
        path: zcodeSqlitePath(dbPath, row.id),
        title: row.title?.trim() || fallbackTitle(row.id),
        cwd: row.directory || row.path || undefined,
        createdAt,
        updatedAt,
        bytes: 1,
      }
    })
  } catch {
    return []
  } finally {
    db.close()
  }
}

async function listJsonSessions(
  root: string,
  depth: number,
  signal?: AbortSignal,
): Promise<DiscoveredSession[]> {
  if (depth < 0) return []
  let entries
  try { entries = await readdir(root, { withFileTypes: true }) }
  catch { return [] }
  const found: DiscoveredSession[] = []
  for (const entry of entries) {
    signal?.throwIfAborted()
    const full = join(root, entry.name)
    if (entry.isDirectory()) {
      found.push(...await listJsonSessions(full, depth - 1, signal))
      continue
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) continue
    let info
    try { info = await stat(full) }
    catch { continue }
    found.push({
      source: 'zcode',
      nativeId: basename(entry.name).replace(/\.json$/u, ''),
      path: full,
      title: fallbackTitle(basename(entry.name).replace(/\.json$/u, '')),
      createdAt: Math.round(info.birthtimeMs || info.mtimeMs),
      updatedAt: Math.round(info.mtimeMs),
      bytes: info.size,
    })
  }
  return found
}

/** Whether a path names a ZCode sqlite session or v2 JSON conversation. */
export function isZcodeSessionPath(path: string): boolean {
  return parseZcodeSqlitePath(path) !== undefined
    || path.includes('/.zcode/v2/sessions/')
    || path.includes('/zcode/.zcode/v2/sessions/')
}
