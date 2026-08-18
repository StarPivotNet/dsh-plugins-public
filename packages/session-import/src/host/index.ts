/**
 * Out-of-tree Host session importer. Registers /import and a loopback RPC
 * channel at /session-import so the Settings page can scan and import
 * Cursor, Codex, and Claude Code conversations and skills.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { stat } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { DEFAULT_CONVERT_LIMITS } from '../convert/types.ts'
import type { DiscoveredSession, ImportSource } from '../convert/types.ts'
import { convertFile, importDiscovered, persistConverted, withWorkspaceCwd } from './import.ts'
import { parseImportArgs } from './parse-args.ts'
import {
  DEFAULT_LIST_LIMIT,
  DISCOVER_CACHE_MS,
  defaultScanRoots,
  discoverSessions,
  filterDiscovered,
  presentSessions,
} from './scan.ts'
import { copySkill, defaultSkillRoots, discoverSkills } from './skills.ts'
import { discoverAutomations, discoverMemories, importMemories } from './compat.ts'
import { ensureWorkspace, type WorkspaceRegistryHandle } from './workspace.ts'

export const name = 'session-import'

export const SESSION_IMPORT_SETTINGS_NAMESPACE = 'session-import'
const SETTINGS_NS = settingsNamespace(SESSION_IMPORT_SETTINGS_NAMESPACE)
const CHANNEL = '/session-import'

export interface Config {
  maxFileBytes?: number
  maxToolResultChars?: number
  maxTextChars?: number
  skillTarget?: string
}

export function apply(ctx: Context, config: Config = {}): void {
  const limits = {
    maxToolResultChars: config.maxToolResultChars ?? DEFAULT_CONVERT_LIMITS.maxToolResultChars,
    maxTextChars: config.maxTextChars ?? DEFAULT_CONVERT_LIMITS.maxTextChars,
  }
  const maxFileBytes = config.maxFileBytes ?? 32 * 1024 * 1024
  const skillTarget = config.skillTarget ?? join(homedir(), '.dsh', 'skills')

  ctx.inject(['settings'], (settingsCtx) => {
    const settings = settingsCtx.get('settings') as {
      register: (ns: unknown, schema: unknown, options?: { base?: unknown }) => unknown
    }
    settings.register(SETTINGS_NS, z.object({
      lastImportAt: z.number().default(0),
    }), { base: { lastImportAt: 0 } })
  })

  ctx.inject(['commands'], (commandCtx) => {
    commandCtx.commands.register({
      name: 'import',
      description: 'Import Cursor, Codex, or Claude Code sessions and skills',
      input: { hint: '[list|all|skills|memory|automations|claude|codex|cursor|path]' },
      handler: invocation => handleImportCommand(commandCtx, invocation.rawInput, {
        limits,
        maxFileBytes,
        skillTarget,
        signal: invocation.signal,
        workspaceCwd: invocation.agent.session.header.cwd,
      }),
    })
  })

  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.connection.rpc.handle(CHANNEL, async (endpoint, payload) => {
      try {
        switch (endpoint) {
          case 'listSessions':
            return { ok: true, value: await listSessions(payload as { source?: ImportSource; query?: string; limit?: number; includeArchived?: boolean }, maxFileBytes) }
          case 'importSessions':
            return { ok: true, value: await importSessions(connectionCtx, payload as { paths?: string[]; source?: ImportSource; keepCwd?: boolean; includeArchived?: boolean }, limits, maxFileBytes) }
          case 'importOneSession':
            return { ok: true, value: await importOneSession(connectionCtx, payload as { path?: string; source?: ImportSource; keepCwd?: boolean }, limits, maxFileBytes) }
          case 'listSkills':
            return { ok: true, value: { entries: await discoverSkills(defaultSkillRoots()) } }
          case 'importSkills':
            return { ok: true, value: await importSkills(payload as { paths?: string[] }, skillTarget) }
          case 'listMemories':
            return { ok: true, value: { entries: await discoverMemories() } }
          case 'importMemories':
            return { ok: true, value: await importMemories((payload as { paths?: string[] }).paths ?? []) }
          case 'listAutomations':
            return { ok: true, value: { entries: await discoverAutomations() } }
          case 'importAutomations':
            return { ok: true, value: await importAutomations(connectionCtx, payload as { paths?: string[] }) }
          default:
            return { ok: false, error: { code: 'NOT_FOUND', message: 'unknown session-import endpoint' } }
        }
      } catch (error) {
        return {
          ok: false,
          error: { code: 'INTERNAL', message: error instanceof Error ? error.message : String(error) },
        }
      }
    }, { authority: 'loopback' })
  })
}

interface ImportRuntime {
  readonly limits: { maxToolResultChars: number; maxTextChars: number }
  readonly maxFileBytes: number
  readonly skillTarget: string
  readonly signal: AbortSignal
  readonly workspaceCwd?: string
}

async function handleImportCommand(
  ctx: Context,
  rawInput: string,
  runtime: ImportRuntime,
): Promise<{ kind: 'success' | 'error'; text: string }> {
  const command = parseImportArgs(rawInput)
  if (command.kind === 'help') {
    return {
      kind: 'success',
      text: [
        'Import foreign agent conversations into this Harness.',
        '/import list [claude|codex|cursor|grok] — discover local sessions',
        '/import all — import every discovered session into this workspace',
        '/import claude|codex|cursor|grok — import one store',
        '/import skills — copy Claude/Codex/Cursor skills into ~/.dsh/skills',
        '/import memory — copy Claude/Codex instruction files into ~/.dsh/AGENTS.md',
        '/import automations — create DSH timers from ~/.codex/automations',
        '/import <path-or-id> — import one file or native id',
        'Imports keep the foreign working directory and create a DSH workspace when it is missing.',
        'Add --here to rewrite imported sessions into the current workspace instead.',
        'Add --archived to include ~/.codex/archived_sessions.',
      ].join('\n'),
    }
  }
  if (command.kind === 'list') {
    const listed = await listedSessions(command.source, runtime.maxFileBytes, {
      signal: runtime.signal,
      limit: 40,
      includeArchived: command.includeArchived,
    })
    if (listed.total === 0) return { kind: 'success', text: 'No foreign sessions found.' }
    const lines = listed.entries.map(row => (
      `${row.source}\t${row.title}\t${row.nativeId}\t${row.path}`
    ))
    const extra = listed.total > listed.entries.length
      ? `\n… ${String(listed.total - listed.entries.length)} more`
      : ''
    return { kind: 'success', text: `Found ${String(listed.total)} session(s).\n${lines.join('\n')}${extra}` }
  }
  if (command.kind === 'skills') {
    const skills = await discoverSkills(defaultSkillRoots(), runtime.signal)
    const selected = command.source === undefined ? skills : skills.filter(skill => skill.source === command.source)
    if (selected.length === 0) return { kind: 'success', text: 'No foreign skills found.' }
    let copied = 0
    let overwritten = 0
    for (const skill of selected) {
      const result = await copySkill(skill, runtime.skillTarget)
      copied += 1
      if (result.overwritten) overwritten += 1
    }
    return {
      kind: 'success',
      text: `Copied ${String(copied)} skill(s) to ${runtime.skillTarget}${overwritten > 0 ? ` (${String(overwritten)} overwritten)` : ''}.`,
    }
  }
  if (command.kind === 'memory') {
    const result = await importMemories([])
    return {
      kind: result.failed.length > 0 && result.copied === 0 ? 'error' : 'success',
      text: `Copied ${String(result.copied)} memory file(s), merged ${String(result.merged)} into ~/.dsh/AGENTS.md${result.failed.length > 0 ? `, failed ${String(result.failed.length)}` : ''}.`,
    }
  }
  if (command.kind === 'automations') {
    const result = await importAutomations(ctx, {})
    return {
      kind: result.failed.length > 0 && result.imported === 0 ? 'error' : 'success',
      text: `Imported ${String(result.imported)} automation(s), skipped ${String(result.skipped)}, unsupported ${String(result.unsupported)}, failed ${String(result.failed.length)}.`,
    }
  }
  const persistence = requirePersistence(ctx)
  if (persistence === undefined) {
    return { kind: 'error', text: 'session persistence is not configured; cannot import conversations.' }
  }
  const query = command.query
  if (query !== undefined && looksLikePath(query)) {
    runtime.signal.throwIfAborted()
    try {
      const converted = relocate(await convertFile(expandHome(query), command.source, runtime.limits), runtime.workspaceCwd, command.keepCwd)
      const outcome = await persistConverted(persistence, converted)
      if (!outcome.ok) return { kind: 'error', text: outcome.message }
      return {
        kind: 'success',
        text: outcome.alreadyImported
          ? `Already imported as ${converted.header.id}.`
          : `Imported ${converted.title} as ${converted.header.id}.`,
      }
    } catch (error) {
      return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
    }
  }
  const selected = await matchingSessions(command.source, runtime.maxFileBytes, query, runtime.signal, command.includeArchived)
  if (selected.length === 0) return { kind: 'error', text: 'No matching foreign sessions.' }
  let imported = 0
  let skipped = 0
  const failures: string[] = []
  for (const row of selected) {
    runtime.signal.throwIfAborted()
    const outcome = await importOne(persistence, row, runtime.limits, runtime.workspaceCwd, command.keepCwd)
    if (!outcome.ok) {
      failures.push(`${row.path}: ${outcome.message}`)
      continue
    }
    if (outcome.alreadyImported) skipped += 1
    else imported += 1
    await settleImported(ctx, outcome.converted.header.id, outcome.converted.header.cwd, outcome.converted.title)
  }
  const failed = failures.length === 0 ? '' : `\nFailed:\n${failures.slice(0, 8).join('\n')}`
  return {
    kind: failures.length > 0 && imported === 0 ? 'error' : 'success',
    text: `Imported ${String(imported)}, already present ${String(skipped)}, failed ${String(failures.length)}.${failed}`,
  }
}

const discoverCache = new Map<string, { expiresAt: number; rows: Promise<DiscoveredSession[]> }>()

function rootsFor(source: ImportSource | undefined, includeArchived = false) {
  const roots = defaultScanRoots(undefined, includeArchived)
  if (source === undefined) return roots
  return {
    claude: source === 'claude' ? roots.claude : [],
    codex: source === 'codex' ? roots.codex : [],
    cursor: source === 'cursor' ? roots.cursor : [],
    grok: source === 'grok' ? roots.grok : [],
  }
}

async function discoveredSessions(
  source: ImportSource | undefined,
  signal?: AbortSignal,
  includeArchived = false,
): Promise<DiscoveredSession[]> {
  const roots = rootsFor(source, includeArchived)
  const key = [...roots.claude, ...roots.codex, ...roots.cursor].join('|')
  const now = Date.now()
  const cached = discoverCache.get(key)
  if (cached !== undefined && cached.expiresAt > now) return cached.rows
  const rows = discoverSessions(roots, signal)
  discoverCache.set(key, { expiresAt: now + DISCOVER_CACHE_MS, rows })
  try {
    return await rows
  } catch (error) {
    discoverCache.delete(key)
    throw error
  }
}

async function listedSessions(
  source: ImportSource | undefined,
  maxFileBytes: number,
  options: { signal?: AbortSignal; query?: string; limit?: number; includeArchived?: boolean } = {},
): Promise<{ entries: DiscoveredSession[]; total: number }> {
  return presentSessions(await discoveredSessions(source, options.signal, options.includeArchived === true), {
    maxFileBytes,
    query: options.query,
    limit: options.limit,
    signal: options.signal,
  })
}

async function matchingSessions(
  source: ImportSource | undefined,
  maxFileBytes: number,
  query: string | undefined,
  signal?: AbortSignal,
  includeArchived = false,
): Promise<DiscoveredSession[]> {
  return filterDiscovered(await discoveredSessions(source, signal, includeArchived), maxFileBytes, query)
}

async function listSessions(
  request: { source?: ImportSource; query?: string; limit?: number; includeArchived?: boolean },
  maxFileBytes: number,
): Promise<{ entries: DiscoveredSession[]; total: number }> {
  return listedSessions(request.source, maxFileBytes, {
    query: request.query,
    limit: request.limit ?? DEFAULT_LIST_LIMIT,
    includeArchived: request.includeArchived === true,
  })
}

async function importSessions(
  ctx: Context,
  request: { paths?: string[]; source?: ImportSource; keepCwd?: boolean; includeArchived?: boolean },
  limits: { maxToolResultChars: number; maxTextChars: number },
  maxFileBytes: number,
): Promise<{ imported: number; skipped: number; failed: { path: string; message: string }[] }> {
  const persistence = requirePersistence(ctx)
  if (persistence === undefined) {
    throw new Error('session persistence is not configured')
  }
  const rows = await matchingSessions(request.source, maxFileBytes, undefined, undefined, request.includeArchived === true)
  const selected = request.paths === undefined || request.paths.length === 0
    ? rows
    : rows.filter(row => request.paths!.includes(row.path))
  let imported = 0
  let skipped = 0
  const failed: { path: string; message: string }[] = []
  for (const row of selected) {
    const outcome = await importOne(persistence, row, limits, workspaceCwdOf(ctx), request.keepCwd !== false)
    if (!outcome.ok) {
      failed.push({ path: row.path, message: outcome.message })
      continue
    }
    if (outcome.alreadyImported) skipped += 1
    else imported += 1
    await settleImported(ctx, outcome.converted.header.id, outcome.converted.header.cwd, outcome.converted.title)
  }
  if (request.paths !== undefined) {
    for (const path of request.paths) {
      if (selected.some(row => row.path === path)) continue
      try {
        const converted = relocate(await convertFile(path, request.source, limits), workspaceCwdOf(ctx), request.keepCwd !== false)
        const outcome = await persistConverted(persistence, converted)
        if (!outcome.ok) failed.push({ path, message: outcome.message })
        else {
          if (outcome.alreadyImported) skipped += 1
          else imported += 1
          await settleImported(ctx, outcome.converted.header.id, outcome.converted.header.cwd, outcome.converted.title)
        }
      } catch (error) {
        failed.push({ path, message: error instanceof Error ? error.message : String(error) })
      }
    }
  }
  return { imported, skipped, failed }
}

async function importOneSession(
  ctx: Context,
  request: { path?: string; source?: ImportSource; keepCwd?: boolean },
  limits: { maxToolResultChars: number; maxTextChars: number },
  maxFileBytes: number,
): Promise<{ imported: number; skipped: number; failed: { path: string; message: string }[]; title?: string }> {
  const path = request.path?.trim() ?? ''
  if (path.length === 0) throw new Error('importOneSession requires path')
  const persistence = requirePersistence(ctx)
  if (persistence === undefined) throw new Error('session persistence is not configured')
  try {
    const info = await stat(path)
    if (info.size > maxFileBytes) {
      return { imported: 0, skipped: 0, failed: [{ path, message: `file exceeds maxFileBytes (${String(info.size)})` }] }
    }
    const converted = relocate(await convertFile(path, request.source), workspaceCwdOf(ctx), request.keepCwd !== false)
    const outcome = await persistConverted(persistence, converted)
    if (!outcome.ok) return { imported: 0, skipped: 0, failed: [{ path, message: outcome.message }] }
    await settleImported(ctx, outcome.converted.header.id, outcome.converted.header.cwd, outcome.converted.title)
    return outcome.alreadyImported
      ? { imported: 0, skipped: 1, failed: [], title: outcome.converted.title }
      : { imported: 1, skipped: 0, failed: [], title: outcome.converted.title }
  } catch (error) {
    return { imported: 0, skipped: 0, failed: [{ path, message: error instanceof Error ? error.message : String(error) }] }
  }
}

async function importSkills(
  request: { paths?: string[] },
  skillTarget: string,
): Promise<{ copied: number; overwritten: number; failed: { path: string; message: string }[] }> {
  const skills = await discoverSkills(defaultSkillRoots())
  const selected = request.paths === undefined || request.paths.length === 0
    ? skills
    : skills.filter(skill => request.paths!.includes(skill.path))
  let copied = 0
  let overwritten = 0
  const failed: { path: string; message: string }[] = []
  for (const skill of selected) {
    try {
      const result = await copySkill(skill, skillTarget)
      copied += 1
      if (result.overwritten) overwritten += 1
    } catch (error) {
      failed.push({ path: skill.path, message: error instanceof Error ? error.message : String(error) })
    }
  }
  return { copied, overwritten, failed }
}

function relocate(
  converted: ReturnType<typeof withWorkspaceCwd>,
  workspaceCwd: string | undefined,
  keepCwd: boolean,
): ReturnType<typeof withWorkspaceCwd> {
  return keepCwd ? converted : withWorkspaceCwd(converted, workspaceCwd)
}

async function importOne(
  persistence: NonNullable<ReturnType<typeof requirePersistence>>,
  row: DiscoveredSession,
  limits: { maxToolResultChars: number; maxTextChars: number },
  workspaceCwd: string | undefined,
  keepCwd: boolean,
): Promise<Awaited<ReturnType<typeof persistConverted>>> {
  if (keepCwd) return importDiscovered(persistence, row, limits)
  const converted = relocate(await convertFile(row.path, row.source, limits), workspaceCwd, false)
  return persistConverted(persistence, converted)
}

function looksLikePath(value: string): boolean {
  return value.startsWith('/') || value.startsWith('~') || /^[A-Za-z]:[\\/]/u.test(value)
}

function expandHome(value: string): string {
  if (value === '~') return homedir()
  if (value.startsWith('~/')) return join(homedir(), value.slice(2))
  return value
}

function requirePersistence(ctx: Context): {
  create(meta: unknown): Promise<void>
  append(id: string, events: unknown): Promise<void>
} | undefined {
  return ctx.get('sessionPersistence') as {
    create(meta: unknown): Promise<void>
    append(id: string, events: unknown): Promise<void>
  } | undefined
}

function workspaceCwdOf(ctx: Context): string | undefined {
  const live = ctx.get('sessions') as { list?: () => Iterable<{ header?: { cwd?: string } }> } | undefined
  for (const session of live?.list?.() ?? []) {
    if (typeof session.header?.cwd === 'string' && session.header.cwd.length > 0) return session.header.cwd
  }
  return process.cwd()
}

async function importAutomations(
  ctx: Context,
  request: { paths?: string[] },
): Promise<{ imported: number; skipped: number; unsupported: number; failed: { path: string; message: string }[] }> {
  const automation = ctx.get('automation') as {
    list?: () => readonly { name?: string; task?: string }[]
    create?: (request: {
      name: string
      task: string
      workspaceId: string
      enabled?: boolean
      everySeconds?: number
      localClock?: { time: string; weekdays?: readonly number[]; time_zone: string }
    }) => Promise<{ id?: string }>
  } | undefined
  if (automation?.create === undefined || automation.list === undefined) {
    throw new Error('automation service is not configured')
  }
  const workspace = ctx.get('workspaceRegistry') as {
    list?: () => readonly { id: string; path?: string }[]
    resolveByPath?: (path: string) => Promise<{ id: string } | undefined>
    create?: (path: string, title?: string) => Promise<{ id: string }>
  } | undefined
  const rows = await discoverAutomations()
  const selected = request.paths === undefined || request.paths.length === 0
    ? rows
    : rows.filter(row => request.paths!.includes(row.path))
  const existing = new Set(automation.list().map(rule => `${rule.name ?? ''}\0${rule.task ?? ''}`))
  let imported = 0
  let skipped = 0
  let unsupported = 0
  const failed: { path: string; message: string }[] = []
  for (const row of selected) {
    if (row.schedule.kind === 'unsupported') {
      unsupported += 1
      failed.push({ path: row.path, message: row.schedule.reason })
      continue
    }
    if (existing.has(`${row.name}\0${row.prompt}`)) {
      skipped += 1
      continue
    }
    try {
      const workspaceId = await resolveWorkspaceId(workspace, row.cwd, workspaceCwdOf(ctx))
      if (workspaceId === undefined) {
        failed.push({ path: row.path, message: 'no DSH workspace available for this automation' })
        continue
      }
      const created = row.schedule.kind === 'every'
        ? await automation.create({
          name: row.name,
          task: row.prompt,
          workspaceId,
          enabled: row.status.toUpperCase() === 'ACTIVE',
          everySeconds: row.schedule.everySeconds,
        })
        : await automation.create({
          name: row.name,
          task: row.prompt,
          workspaceId,
          enabled: row.status.toUpperCase() === 'ACTIVE',
          localClock: {
            time: row.schedule.time,
            ...(row.schedule.weekdays === undefined ? {} : { weekdays: row.schedule.weekdays }),
            time_zone: row.schedule.timeZone,
          },
        })
      if (created === undefined) failed.push({ path: row.path, message: 'automation.create returned nothing' })
      else imported += 1
    } catch (error) {
      failed.push({ path: row.path, message: error instanceof Error ? error.message : String(error) })
    }
  }
  return { imported, skipped, unsupported, failed }
}

async function resolveWorkspaceId(
  registry: WorkspaceRegistryHandle | undefined,
  cwd: string | undefined,
  fallbackCwd: string | undefined,
): Promise<string | undefined> {
  const workspace = await ensureWorkspace(registry, cwd ?? fallbackCwd)
  return workspace?.id ?? registry?.list?.()[0]?.id
}

async function settleImported(ctx: Context, id: string, cwd: string | undefined, _title?: string): Promise<void> {
  await attachImported(ctx, id, cwd)
}

async function attachImported(ctx: Context, id: string, cwd: string | undefined): Promise<void> {
  const registry = ctx.get('workspaceRegistry') as WorkspaceRegistryHandle | undefined
  if (registry === undefined) return
  try {
    const workspace = await ensureWorkspace(registry, cwd ?? workspaceCwdOf(ctx))
    await workspace?.attachSession?.(id)
  } catch {
    // The session remains openable from Ungrouped if workspace membership fails.
  }
}




