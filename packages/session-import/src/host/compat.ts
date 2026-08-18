/** Discover and convert Codex/Claude memory files and Codex automations. */

import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'

/** One foreign instruction or memory Markdown file. */
export interface DiscoveredMemory {
  readonly source: 'claude' | 'codex'
  readonly kind: 'agents' | 'memory'
  readonly name: string
  readonly path: string
  readonly bytes: number
  readonly preview: string
}

/** One Codex automation.toml after a best-effort DSH mapping. */
export interface DiscoveredAutomation {
  readonly source: 'codex'
  readonly nativeId: string
  readonly name: string
  readonly path: string
  readonly status: string
  readonly cwd?: string
  readonly rrule?: string
  readonly prompt: string
  readonly schedule: MappedSchedule
}

/** DSH selector that can be created from a Codex RRULE, or a skipped reason. */
export type MappedSchedule =
  | { readonly kind: 'local-clock'; readonly time: string; readonly weekdays?: readonly number[]; readonly timeZone: string }
  | { readonly kind: 'every'; readonly everySeconds: number }
  | { readonly kind: 'unsupported'; readonly reason: string }

const WEEKDAY_TO_ISO: Record<string, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
}

/** Default homes for instruction and memory files. */
export function defaultMemoryRoots(home = homedir()): readonly { source: 'claude' | 'codex'; kind: 'agents' | 'memory'; path: string; name: string }[] {
  return [
    { source: 'claude', kind: 'agents', path: join(home, '.claude', 'CLAUDE.md'), name: 'claude-claude-md' },
    { source: 'codex', kind: 'agents', path: join(home, '.codex', 'AGENTS.md'), name: 'codex-agents-md' },
    { source: 'codex', kind: 'memory', path: join(home, '.codex', 'memories', 'MEMORY.md'), name: 'codex-memory' },
    { source: 'codex', kind: 'memory', path: join(home, '.codex', 'memories', 'memory_summary.md'), name: 'codex-memory-summary' },
  ]
}

/** List existing foreign memory files. */
export async function discoverMemories(home = homedir()): Promise<DiscoveredMemory[]> {
  const found: DiscoveredMemory[] = []
  for (const root of defaultMemoryRoots(home)) {
    let info
    try { info = await stat(root.path) }
    catch { continue }
    if (!info.isFile()) continue
    let text = ''
    try { text = await readFile(root.path, 'utf8') }
    catch { continue }
    found.push({
      source: root.source,
      kind: root.kind,
      name: root.name,
      path: root.path,
      bytes: info.size,
      preview: firstPreview(text),
    })
  }
  return found
}

/** Copy selected memory files into `~/.dsh/imported-memory`, and merge agents files into `~/.dsh/AGENTS.md`. */
export async function importMemories(
  paths: readonly string[],
  home = homedir(),
): Promise<{ copied: number; merged: number; failed: { path: string; message: string }[] }> {
  const targetRoot = join(home, '.dsh', 'imported-memory')
  await mkdir(targetRoot, { recursive: true })
  let copied = 0
  let merged = 0
  const failed: { path: string; message: string }[] = []
  const known = await discoverMemories(home)
  const selected = paths.length === 0 ? known : known.filter(row => paths.includes(row.path))
  for (const row of selected) {
    try {
      const text = await readFile(row.path, 'utf8')
      const dest = join(targetRoot, `${row.name}.md`)
      await writeFile(dest, ensureTrailingNewline(text), 'utf8')
      copied += 1
      if (row.kind === 'agents') {
        await mergeAgentsFile(join(home, '.dsh', 'AGENTS.md'), row.path, text)
        merged += 1
      }
    } catch (error) {
      failed.push({ path: row.path, message: error instanceof Error ? error.message : String(error) })
    }
  }
  return { copied, merged, failed }
}

/** List Codex automations under `~/.codex/automations`. */
export async function discoverAutomations(home = homedir()): Promise<DiscoveredAutomation[]> {
  const root = join(home, '.codex', 'automations')
  let entries
  try { entries = await readdir(root, { withFileTypes: true }) }
  catch { return [] }
  const found: DiscoveredAutomation[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const path = join(root, entry.name, 'automation.toml')
    try {
      const text = await readFile(path, 'utf8')
      const parsed = parseAutomationToml(text, path)
      if (parsed !== undefined) found.push(parsed)
    } catch {
      continue
    }
  }
  found.sort((left, right) => left.name.localeCompare(right.name) || left.path.localeCompare(right.path))
  return found
}

/** Map one Codex automation.toml document onto a discovered row. */
export function parseAutomationToml(text: string, path: string): DiscoveredAutomation | undefined {
  const fields = parseSimpleToml(text)
  const nativeId = String(fields.id ?? basename(dirname(path)))
  const name = String(fields.name ?? nativeId)
  const prompt = String(fields.prompt ?? '')
  if (prompt.trim().length === 0) return undefined
  const rrule = typeof fields.rrule === 'string' ? fields.rrule : undefined
  const cwd = firstCwd(fields.cwds)
  return {
    source: 'codex',
    nativeId,
    name,
    path,
    status: String(fields.status ?? 'UNKNOWN'),
    cwd,
    rrule,
    prompt,
    schedule: mapRrule(rrule),
  }
}

/** Convert a Codex RRULE into a DSH local-clock or interval selector. */
export function mapRrule(rrule: string | undefined, timeZone = 'Asia/Shanghai'): MappedSchedule {
  if (rrule === undefined || rrule.trim().length === 0) {
    return { kind: 'unsupported', reason: 'missing RRULE' }
  }
  const body = rrule.replace(/^RRULE:/u, '')
  const parts = Object.fromEntries(
    body.split(';').map(part => {
      const [rawKey, rawValue = ''] = part.split('=')
      return [rawKey.toUpperCase(), rawValue]
    }),
  )
  const freq = parts.FREQ
  const interval = Number.parseInt(parts.INTERVAL ?? '1', 10)
  if (freq === 'MINUTELY' && Number.isSafeInteger(interval) && interval > 0) {
    const everySeconds = interval * 60
    if (everySeconds < 300) return { kind: 'unsupported', reason: `interval ${String(everySeconds)}s is below DSH minEverySeconds=300` }
    return { kind: 'every', everySeconds }
  }
  if (freq === 'HOURLY' && Number.isSafeInteger(interval) && interval > 0) {
    return { kind: 'every', everySeconds: interval * 3600 }
  }
  if (freq === 'DAILY' || freq === 'WEEKLY') {
    const hour = clampInt(parts.BYHOUR, 0, 23, 2)
    const minute = clampInt(parts.BYMINUTE, 0, 59, 0)
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    const weekdays = parseWeekdays(parts.BYDAY)
    if (freq === 'DAILY' && (parts.INTERVAL === undefined || parts.INTERVAL === '1') && weekdays === undefined) {
      return { kind: 'local-clock', time, timeZone }
    }
    if (freq === 'WEEKLY' && (parts.INTERVAL === undefined || parts.INTERVAL === '1')) {
      return { kind: 'local-clock', time, ...(weekdays === undefined ? {} : { weekdays }), timeZone }
    }
  }
  return { kind: 'unsupported', reason: `unsupported RRULE ${rrule}` }
}

function parseWeekdays(raw: string | undefined): readonly number[] | undefined {
  if (raw === undefined || raw.length === 0) return undefined
  const days = [...new Set(
    raw.split(',').map(token => WEEKDAY_TO_ISO[token.replace(/^-?\d+/u, '').toUpperCase()]).filter((day): day is number => day !== undefined),
  )].sort((left, right) => left - right)
  if (days.length === 0) return undefined
  if (days.length === 7) return undefined
  return days
}

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  const value = Number.parseInt(raw ?? '', 10)
  if (!Number.isSafeInteger(value) || value < min || value > max) return fallback
  return value
}

function firstCwd(value: unknown): string | undefined {
  if (typeof value === 'string' && value.startsWith('/')) return value
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === 'string' && item.startsWith('/'))
    return first
  }
  return undefined
}

function firstPreview(text: string): string {
  const line = text.replace(/\s+/gu, ' ').trim()
  return line.length <= 160 ? line : `${line.slice(0, 159)}…`
}

function ensureTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`
}

async function mergeAgentsFile(target: string, sourcePath: string, text: string): Promise<void> {
  await mkdir(dirname(target), { recursive: true })
  let existing = ''
  try { existing = await readFile(target, 'utf8') }
  catch { existing = '' }
  const marker = `<!-- imported-from ${sourcePath} -->`
  if (existing.includes(marker)) return
  const block = `${existing.trimEnd()}${existing.trim().length === 0 ? '' : '\n\n'}${marker}\n${text.trimEnd()}\n`
  await writeFile(target, block, 'utf8')
}

/** Parse the flat Codex automation.toml subset this importer understands. */
export function parseSimpleToml(text: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.trim()
    if (line.length === 0 || line.startsWith('#') || line.startsWith('[')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    fields[key] = decodeTomlValue(line.slice(eq + 1).trim())
  }
  return fields
}

function decodeTomlValue(raw: string): unknown {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (/^-?\d+$/u.test(raw)) return Number(raw)
  if (raw.startsWith('"') && raw.endsWith('"')) return unescapeTomlString(raw.slice(1, -1))
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim()
    if (inner.length === 0) return []
    return inner.split(',').map(part => decodeTomlValue(part.trim()))
  }
  if (raw.startsWith('{') && raw.endsWith('}')) return raw
  return raw
}

function unescapeTomlString(value: string): string {
  return value
    .replace(/\\n/gu, '\n')
    .replace(/\\t/gu, '\t')
    .replace(/\\"/gu, '"')
    .replace(/\\\\/gu, '\\')
}
