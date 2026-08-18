/** Discover foreign sessions and skills on the local filesystem. */

import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { open, readdir, stat } from 'node:fs/promises'
import { fallbackTitle, isRecord } from '../convert/text.ts'
import type { DiscoveredSession, ImportSource } from '../convert/types.ts'

/** Newest conversations the Settings page and `/import list` show by default. */
export const DEFAULT_LIST_LIMIT = 300

/** Bytes read from the head of a conversation file while building the list. */
export const PREVIEW_BYTES = 64_000

/** How many conversation files to stat at once under one directory. */
const STAT_CONCURRENCY = 32

/** How many conversation heads to read at once while enriching the list. */
const PREVIEW_CONCURRENCY = 16

/** How long a Host process reuses one filesystem walk. */
export const DISCOVER_CACHE_MS = 30_000

/** Roots the Host will scan unless the operator overrides them. */
export interface ScanRoots {
  readonly claude: readonly string[]
  readonly codex: readonly string[]
  readonly cursor: readonly string[]
}

/** Options for turning a discovered walk into a Settings or `/import list` page. */
export interface PresentSessionsOptions {
  readonly maxFileBytes: number
  readonly limit?: number
  readonly query?: string
  readonly signal?: AbortSignal
  readonly readPreview?: (path: string) => Promise<string>
}

/** Default homes for Claude Code, Codex, and Cursor. */
export function defaultScanRoots(home = homedir(), includeArchived = false): ScanRoots {
  const codex = [join(home, '.codex', 'sessions')]
  if (includeArchived) codex.push(join(home, '.codex', 'archived_sessions'))
  return {
    claude: [
      join(home, '.claude', 'projects'),
      join(home, '.claude', 'sessions'),
    ],
    codex,
    cursor: [
      join(home, '.cursor', 'projects'),
      join(home, '.cursor', 'chats'),
      join(home, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage'),
      join(home, 'AppData', 'Roaming', 'Cursor', 'User', 'workspaceStorage'),
    ],
  }
}

/** Recursively list foreign conversation files under the configured roots. */
export async function discoverSessions(roots: ScanRoots, signal?: AbortSignal): Promise<DiscoveredSession[]> {
  const found: DiscoveredSession[] = []
  await walk(roots.claude, 'claude', found, signal)
  await walk(roots.codex, 'codex', found, signal)
  await walk(roots.cursor, 'cursor', found, signal)
  found.sort((left, right) => right.updatedAt - left.updatedAt || left.path.localeCompare(right.path))
  return found
}

/** Keep conversations that fit the size budget and optional title/path filter. */
export function filterDiscovered(
  rows: readonly DiscoveredSession[],
  maxFileBytes: number,
  query?: string,
): DiscoveredSession[] {
  const needle = query?.trim().toLowerCase() ?? ''
  return rows.filter((row) => {
    if (row.bytes > maxFileBytes) return false
    if (needle.length === 0) return true
    return row.title.toLowerCase().includes(needle)
      || row.path.toLowerCase().includes(needle)
      || row.nativeId.toLowerCase().includes(needle)
  })
}

/** Enrich the newest matching conversations without reading whole files. */
export async function presentSessions(
  rows: readonly DiscoveredSession[],
  options: PresentSessionsOptions,
): Promise<{ entries: DiscoveredSession[]; total: number }> {
  const filtered = filterDiscovered(rows, options.maxFileBytes, options.query)
    .slice()
    .sort((left, right) => right.updatedAt - left.updatedAt || left.path.localeCompare(right.path))
  const limit = options.limit ?? DEFAULT_LIST_LIMIT
  const slice = filtered.slice(0, Math.max(0, limit))
  const read = options.readPreview ?? readPreview
  const entries = new Array<DiscoveredSession>(slice.length)
  await mapLimit(slice, PREVIEW_CONCURRENCY, async (row, index) => {
    options.signal?.throwIfAborted()
    try {
      entries[index] = enrichFromPreview(row, await read(row.path))
    } catch {
      entries[index] = row
    }
  })
  return { entries, total: filtered.length }
}

/** Read only the head of a conversation file for title and cwd. */
export async function readPreview(path: string, maxBytes = PREVIEW_BYTES): Promise<string> {
  const handle = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(Math.max(1, maxBytes))
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    return buffer.toString('utf8', 0, bytesRead)
  } finally {
    await handle.close()
  }
}

/** Walk one source's roots. */
async function walk(
  roots: readonly string[],
  source: ImportSource,
  found: DiscoveredSession[],
  signal: AbortSignal | undefined,
): Promise<void> {
  for (const root of roots) {
    signal?.throwIfAborted()
    await visit(root, source, found, 0, signal)
  }
}

/** Recurse through a directory looking for conversation files. */
async function visit(
  path: string,
  source: ImportSource,
  found: DiscoveredSession[],
  depth: number,
  signal: AbortSignal | undefined,
): Promise<void> {
  if (depth > 8) return
  signal?.throwIfAborted()
  let entries
  try { entries = await readdir(path, { withFileTypes: true }) }
  catch { return }
  const files: string[] = []
  const directories: string[] = []
  for (const entry of entries) {
    const full = join(path, entry.name)
    if (entry.isDirectory()) directories.push(full)
    else if (entry.isFile() && isSessionFile(source, entry.name)) files.push(full)
  }
  await mapLimit(files, STAT_CONCURRENCY, async (full) => {
    signal?.throwIfAborted()
    let info
    try { info = await stat(full) }
    catch { return }
    found.push({
      source,
      nativeId: nativeIdFromName(source, basename(full)),
      path: full,
      title: fallbackTitle(nativeIdFromName(source, basename(full))),
      createdAt: Math.round(info.birthtimeMs || info.mtimeMs),
      updatedAt: Math.round(info.mtimeMs),
      bytes: info.size,
    })
  })
  for (const directory of directories) {
    await visit(directory, source, found, depth + 1, signal)
  }
}

/** Run async work over items with a fixed number of workers. */
async function mapLimit<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next
      next += 1
      await fn(items[index]!, index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
}

/** Whether a filename looks like a conversation artifact for this source. */
export function isSessionFile(source: ImportSource, name: string): boolean {
  const lower = name.toLowerCase()
  if (source === 'claude') return lower.endsWith('.jsonl')
  if (source === 'codex') return lower.endsWith('.jsonl') && (lower.startsWith('rollout-') || lower.includes('session'))
  return lower.endsWith('.jsonl') || (lower.endsWith('.json') && /composer|transcript|chat|conversation/u.test(lower))
}

/** Session id taken from a conversation filename. */
export function nativeIdFromName(source: ImportSource, name: string): string {
  const bare = name.replace(/\.(jsonl|json)$/u, '')
  if (source === 'codex') return bare.replace(/^rollout-\d{4}-\d{2}-\d{2}T[0-9-]+-/, '')
  return bare
}

/** Enrich a discovered row with title/cwd from the first few JSONL records. */
export function enrichFromPreview(row: DiscoveredSession, text: string): DiscoveredSession {
  const head = text.slice(0, PREVIEW_BYTES)
  let title = row.title
  let cwd = row.cwd
  let nativeId = row.nativeId
  let createdAt = row.createdAt
  for (const line of head.split(/\r?\n/u).slice(0, 40)) {
    if (line.trim().length === 0) continue
    let record: unknown
    try { record = JSON.parse(line) }
    catch { continue }
    if (!isRecord(record)) continue
    if (typeof record.sessionId === 'string') nativeId = record.sessionId
    if (typeof record.cwd === 'string') cwd = record.cwd
    if (typeof record.aiTitle === 'string') title = record.aiTitle
    if (typeof record.timestamp === 'string') {
      const parsed = Date.parse(record.timestamp)
      if (Number.isFinite(parsed) && (createdAt === row.createdAt || parsed < createdAt)) createdAt = parsed
    }
    const payload = isRecord(record.payload) ? record.payload : undefined
    if (record.type === 'session_meta' && payload !== undefined) {
      if (typeof payload.id === 'string') nativeId = payload.id
      if (typeof payload.cwd === 'string') cwd = payload.cwd
      if (typeof payload.thread_name === 'string') title = payload.thread_name
    }
    if (record.type === 'user' && isRecord(record.message) && typeof record.message.content === 'string' && title === row.title) {
      title = fallbackTitle(record.message.content)
    }
  }
  return { ...row, nativeId, title, cwd, createdAt }
}

/** Basename helper exported for tests. */
export function fileName(path: string): string {
  return basename(path)
}
