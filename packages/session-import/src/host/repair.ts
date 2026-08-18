/** Move leftover imported sessions back to their original project workspaces. */

import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { mkdir, open, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { constants, zstdCompress, zstdDecompress } from 'node:zlib'
import { promisify } from 'node:util'
import { cwdFromClaudeProjectPath } from '../convert/claude.ts'
import { sessionName } from '../convert/events.ts'
import { parseGrokSummary } from '../convert/grok.ts'
import { asString, isInstructionDump, isRecord } from '../convert/text.ts'
import { importedSessionId } from '../convert/types.ts'
import { defaultScanRoots, isSessionFile } from './scan.ts'
import { ensureWorkspace, type WorkspaceRegistryHandle } from './workspace.ts'

const zstdCompressAsync = promisify(zstdCompress)
const zstdDecompressAsync = promisify(zstdDecompress)
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const CHECKSUM = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }

/** One foreign conversation that can repair an already-imported DSH session. */
export interface ForeignOrigin {
  readonly id: string
  readonly cwd: string
  readonly title: string
}

/** Result of one repair pass over leftover imported sessions. */
export interface RepairResult {
  readonly repaired: number
  readonly skipped: number
  readonly failed: { readonly id: string; readonly message: string }[]
}

/** Find original Codex / Grok / Claude cwd and title for leftover imports. */
export async function discoverForeignOrigins(): Promise<Map<string, ForeignOrigin>> {
  const found = new Map<string, ForeignOrigin>()
  const roots = defaultScanRoots()
  await Promise.all([
    collectCodexOrigins(roots.codex, found),
    collectGrokOrigins(roots.grok, found),
    collectClaudeOrigins(roots.claude, found),
  ])
  return found
}

/** Rewrite leftover import logs onto their original cwd and attach them. */
export async function repairImportedSessions(
  ctx: { get: (name: string) => unknown },
): Promise<RepairResult> {
  const origins = await discoverForeignOrigins()
  const persistence = ctx.get('sessionPersistence') as {
    list?: () => Promise<readonly { id: string; cwd?: string }[]>
  } | undefined
  const headers = persistence?.list === undefined ? [] : await persistence.list()
  const registry = ctx.get('workspaceRegistry') as WorkspaceRegistryHandle | undefined
  let repaired = 0
  let skipped = 0
  const failed: { id: string; message: string }[] = []
  for (const header of headers.filter(item => item.id.startsWith('import-'))) {
    const origin = origins.get(header.id)
    if (origin === undefined) {
      skipped += 1
      continue
    }
    try {
      const changed = await repairOneOnDisk(header.id, origin)
      await rehomeLive(registry, header.id, origin.cwd)
      if (changed) repaired += 1
      else skipped += 1
    } catch (error) {
      failed.push({ id: header.id, message: error instanceof Error ? error.message : String(error) })
    }
  }
  return { repaired, skipped, failed }
}

/** Repair leftover imports on disk when the Host services are not available. */
export async function repairImportedOnDisk(options: {
  readonly sessionRoot: string
  readonly workspacePath: string
  readonly cachePath: string
  readonly origins?: Map<string, ForeignOrigin>
}): Promise<RepairResult> {
  const origins = options.origins ?? await discoverForeignOrigins()
  const workspace = JSON.parse(await readFile(options.workspacePath, 'utf8')) as WorkspaceFile
  const cache = JSON.parse(await readFile(options.cachePath, 'utf8')) as CacheFile
  let repaired = 0
  let skipped = 0
  const failed: { id: string; message: string }[] = []
  for (const item of await listImportSessionDirs(options.sessionRoot)) {
    const origin = origins.get(item.id)
    if (origin === undefined) {
      skipped += 1
      continue
    }
    try {
      const header = await readStoredHeader(join(item.dir, 'session.jsonl.zstd'))
      const title = origin.title
      const alreadyHome = header.cwd === origin.cwd && attachedTo(workspace, item.id, origin.cwd)
      const titleSame = cache.tables.sessions[item.id]?.rows?.title?.val === title
      if (alreadyHome && titleSame) {
        skipped += 1
        continue
      }
      if (header.cwd !== origin.cwd) {
        await rewriteHeaderCwd(join(item.dir, 'session.jsonl.zstd'), origin.cwd)
        await moveSessionDir(options.sessionRoot, item.dir, origin.cwd, item.id)
      }
      patchCache(cache, item.id, origin.cwd, title, header.createdAt)
      rehomeWorkspace(workspace, item.id, origin.cwd)
      repaired += 1
    } catch (error) {
      failed.push({ id: item.id, message: error instanceof Error ? error.message : String(error) })
    }
  }
  await writeFile(options.workspacePath, JSON.stringify(workspace, null, 2) + '\n')
  await writeFile(options.cachePath, JSON.stringify(cache))
  return { repaired, skipped, failed }
}

async function repairOneOnDisk(id: string, origin: ForeignOrigin): Promise<boolean> {
  const sessionRoot = join(homedir(), '.dsh', 'sessions')
  const dir = (await listImportSessionDirs(sessionRoot)).find(item => item.id === id)?.dir
  if (dir === undefined) throw new Error('no stored log for ' + id)
  const header = await readStoredHeader(join(dir, 'session.jsonl.zstd'))
  if (header.cwd === origin.cwd) return false
  await rewriteHeaderCwd(join(dir, 'session.jsonl.zstd'), origin.cwd)
  await moveSessionDir(sessionRoot, dir, origin.cwd, id)
  return true
}

async function rehomeLive(
  registry: WorkspaceRegistryHandle | undefined,
  id: string,
  cwd: string,
): Promise<void> {
  if (registry === undefined) return
  for (const workspace of registry.list?.() ?? []) {
    try { await (workspace as { detachSession?: (sessionId: string) => Promise<void> }).detachSession?.(id) }
    catch { /* rewritten below */ }
  }
  const workspace = await ensureWorkspace(registry, cwd)
  await workspace?.attachSession?.(id)
}

async function collectCodexOrigins(roots: readonly string[], found: Map<string, ForeignOrigin>): Promise<void> {
  for (const root of roots) {
    for (const path of await walkFiles(root, 8, name => isSessionFile('codex', name))) {
      const preview = await readHead(path, 64_000)
      const nativeId = basename(path).replace(/\.jsonl$/u, '').replace(/^rollout-\d{4}-\d{2}-\d{2}T[0-9-]+-/u, '')
      const payload = firstJsonObject(preview)
      const body = isRecord(payload?.payload) ? payload.payload : payload
      const cwd = asString(body?.cwd)
      if (cwd === undefined) continue
      const title = sessionName(asString(body?.thread_name) ?? firstCodexUserText(preview) ?? nativeId)
      found.set(importedSessionId('codex', nativeId), { id: importedSessionId('codex', nativeId), cwd, title })
    }
  }
}

async function collectGrokOrigins(roots: readonly string[], found: Map<string, ForeignOrigin>): Promise<void> {
  for (const root of roots) {
    for (const path of await walkFiles(root, 8, name => isSessionFile('grok', name))) {
      let summary
      try { summary = parseGrokSummary(await readFile(join(dirname(path), 'summary.json'), 'utf8')) }
      catch { summary = {} }
      const nativeId = summary.id ?? basename(dirname(path))
      if (summary.cwd === undefined) continue
      found.set(importedSessionId('grok', nativeId), {
        id: importedSessionId('grok', nativeId),
        cwd: summary.cwd,
        title: sessionName(summary.title ?? nativeId),
      })
    }
  }
}

async function collectClaudeOrigins(roots: readonly string[], found: Map<string, ForeignOrigin>): Promise<void> {
  for (const root of roots) {
    for (const path of await walkFiles(root, 8, name => isSessionFile('claude', name))) {
      const preview = await readHead(path, 64_000)
      const record = firstJsonObject(preview)
      const nativeId = asString(record?.sessionId) ?? basename(path).replace(/\.jsonl$/u, '')
      const cwd = asString(record?.cwd) ?? cwdFromClaudeProjectPath(path)
      if (cwd === undefined) continue
      found.set(importedSessionId('claude', nativeId), {
        id: importedSessionId('claude', nativeId),
        cwd,
        title: sessionName(firstClaudeUserText(preview) ?? nativeId),
      })
    }
  }
}

async function walkFiles(root: string, depth: number, accept: (name: string) => boolean): Promise<string[]> {
  if (depth < 0) return []
  let entries
  try { entries = await readdir(root, { withFileTypes: true }) }
  catch { return [] }
  const files: string[] = []
  const dirs: string[] = []
  for (const entry of entries) {
    const full = join(root, entry.name)
    if (entry.isDirectory()) dirs.push(full)
    else if (entry.isFile() && accept(entry.name)) files.push(full)
  }
  const nested = await Promise.all(dirs.map(dir => walkFiles(dir, depth - 1, accept)))
  return files.concat(...nested)
}

async function listImportSessionDirs(root: string): Promise<{ id: string; dir: string }[]> {
  const found: { id: string; dir: string }[] = []
  let projects
  try { projects = await readdir(root, { withFileTypes: true }) }
  catch { return found }
  for (const project of projects) {
    if (!project.isDirectory()) continue
    let sessions
    try { sessions = await readdir(join(root, project.name), { withFileTypes: true }) }
    catch { continue }
    for (const session of sessions) {
      if (session.isDirectory() && session.name.startsWith('import-')) {
        found.push({ id: session.name, dir: join(root, project.name, session.name) })
      }
    }
  }
  return found
}

async function rewriteHeaderCwd(path: string, cwd: string): Promise<void> {
  const buffer = await readFile(path)
  const firstEnd = firstZstdFrameEnd(buffer)
  const headerText = (await zstdDecompressAsync(buffer.subarray(0, firstEnd))).toString('utf8')
  const header = JSON.parse(headerText) as { cwd?: string }
  header.cwd = cwd
  const next = await zstdCompressAsync(JSON.stringify(header) + '\n', CHECKSUM)
  await writeFile(path, Buffer.concat([next, buffer.subarray(firstEnd)]))
}

async function readStoredHeader(path: string): Promise<{ id: string; cwd?: string; createdAt: number }> {
  const buffer = await readFile(path)
  const firstEnd = firstZstdFrameEnd(buffer)
  return JSON.parse((await zstdDecompressAsync(buffer.subarray(0, firstEnd))).toString('utf8')) as {
    id: string
    cwd?: string
    createdAt: number
  }
}

async function moveSessionDir(root: string, from: string, cwd: string, id: string): Promise<void> {
  const dest = join(root, projectKey(cwd), id)
  if (from === dest) return
  await mkdir(join(root, projectKey(cwd)), { recursive: true })
  try { await rename(from, dest) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
}

function firstZstdFrameEnd(buffer: Buffer): number {
  const next = buffer.indexOf(ZSTD_MAGIC, 4)
  return next === -1 ? buffer.length : next
}

function projectKey(cwd: string): string {
  let readable = ''
  let separatorRun = false
  for (const ch of cwd) {
    if (ch === '/' || ch === '\\' || ch === ':') {
      if (!separatorRun) readable += '-'
      separatorRun = true
    } else if (ch !== '~' && /^[A-Za-z0-9._-]$/u.test(ch)) {
      readable += ch
      separatorRun = false
    } else {
      readable += '~' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')
      separatorRun = false
    }
  }
  return '--' + (readable.replace(/^-+/u, '') || 'root').slice(0, 251) + '--'
}

function firstJsonObject(text: string): Record<string, unknown> | undefined {
  for (const line of text.split(/\r?\n/u)) {
    if (line.trim().length === 0) continue
    try {
      const parsed: unknown = JSON.parse(line)
      if (isRecord(parsed)) return parsed
    } catch { continue }
  }
  return undefined
}

function firstCodexUserText(text: string): string | undefined {
  for (const line of text.split(/\r?\n/u).slice(0, 80)) {
    let record: unknown
    try { record = JSON.parse(line) }
    catch { continue }
    if (!isRecord(record)) continue
    const payload = isRecord(record.payload) ? record.payload : record
    if (record.type === 'event_msg' && payload.type === 'user_message' && typeof payload.message === 'string') {
      if (!isInstructionDump(payload.message)) return payload.message
    }
    if (payload.type === 'message' && payload.role === 'user') {
      const content = payload.content
      const blob = Array.isArray(content)
        ? content.map(item => isRecord(item) ? asString(item.text) ?? '' : '').join('')
        : asString(content)
      if (blob !== undefined && blob.length > 0 && !isInstructionDump(blob)) return blob
    }
  }
  return undefined
}

function firstClaudeUserText(text: string): string | undefined {
  for (const line of text.split(/\r?\n/u).slice(0, 40)) {
    let record: unknown
    try { record = JSON.parse(line) }
    catch { continue }
    if (!isRecord(record) || record.type !== 'user' || !isRecord(record.message)) continue
    const content = record.message.content
    const blob = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map(item => isRecord(item) ? asString(item.text) ?? '' : '').join('')
        : ''
    if (blob.length > 0 && !isInstructionDump(blob)) return blob
  }
  return undefined
}

async function readHead(path: string, bytes: number): Promise<string> {
  const handle = await open(path, 'r')
  try {
    const info = await stat(path)
    const size = Math.min(bytes, Number(info.size))
    const buffer = Buffer.alloc(size)
    await handle.read(buffer, 0, size, 0)
    return buffer.toString('utf8')
  } finally {
    await handle.close()
  }
}

interface WorkspaceFile {
  tables: { workspaces: Record<string, { path: string; sessionIds?: string[] }> }
}

interface CacheFile {
  tables: { sessions: Record<string, {
    identity?: { createdAt?: number; cwd?: string }
    rows?: Record<string, { ver?: number; seq?: number; val?: unknown }>
  }> }
}

function attachedTo(workspace: WorkspaceFile, id: string, cwd: string): boolean {
  return Object.values(workspace.tables.workspaces).some(row => row.path === cwd && (row.sessionIds ?? []).includes(id))
}

function rehomeWorkspace(workspace: WorkspaceFile, id: string, cwd: string): void {
  let target: { path: string; sessionIds?: string[] } | undefined
  for (const row of Object.values(workspace.tables.workspaces)) {
    row.sessionIds = (row.sessionIds ?? []).filter(sessionId => sessionId !== id)
    if (row.path === cwd) target = row
  }
  if (target === undefined) return
  target.sessionIds = [...target.sessionIds ?? [], id]
}

function patchCache(cache: CacheFile, id: string, cwd: string, title: string, createdAt: number): void {
  const current = cache.tables.sessions[id] ?? { identity: { createdAt, cwd }, rows: {} }
  cache.tables.sessions[id] = {
    ...current,
    identity: { createdAt: current.identity?.createdAt ?? createdAt, cwd },
    rows: {
      ...current.rows,
      title: {
        ver: current.rows?.title?.ver ?? 1,
        seq: current.rows?.title?.seq ?? 0,
        val: title,
      },
    },
  }
}
