/** Discover foreign sessions and skills on the local filesystem. */

import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { readdir, stat } from 'node:fs/promises'
import { fallbackTitle, isRecord } from '../convert/text.ts'
import type { DiscoveredSession, ImportSource } from '../convert/types.ts'

/** Roots the Host will scan unless the operator overrides them. */
export interface ScanRoots {
  readonly claude: readonly string[]
  readonly codex: readonly string[]
  readonly cursor: readonly string[]
}

/** Default homes for Claude Code, Codex, and Cursor. */
export function defaultScanRoots(home = homedir()): ScanRoots {
  return {
    claude: [
      join(home, '.claude', 'projects'),
      join(home, '.claude', 'sessions'),
    ],
    codex: [
      join(home, '.codex', 'sessions'),
      join(home, '.codex', 'archived_sessions'),
    ],
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
  for (const entry of entries) {
    const full = join(path, entry.name)
    if (entry.isDirectory()) {
      await visit(full, source, found, depth + 1, signal)
      continue
    }
    if (!entry.isFile() || !isSessionFile(source, entry.name)) continue
    let info
    try { info = await stat(full) }
    catch { continue }
    found.push({
      source,
      nativeId: nativeIdFromName(source, entry.name),
      path: full,
      title: fallbackTitle(nativeIdFromName(source, entry.name)),
      createdAt: info.birthtimeMs || info.mtimeMs,
      updatedAt: info.mtimeMs,
      bytes: info.size,
    })
  }
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
  const head = text.slice(0, 64_000)
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
