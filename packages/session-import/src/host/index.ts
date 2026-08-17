/**
 * Out-of-tree Host session importer. Registers /import and a loopback RPC
 * channel at /session-import so the Settings page can scan and import
 * Cursor, Codex, and Claude Code conversations and skills.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { DEFAULT_CONVERT_LIMITS } from '../convert/types.ts'
import type { DiscoveredSession, ImportSource } from '../convert/types.ts'
import { convertFile, importDiscovered, persistConverted, withWorkspaceCwd } from './import.ts'
import { parseImportArgs } from './parse-args.ts'
import { defaultScanRoots, discoverSessions, enrichFromPreview } from './scan.ts'
import { copySkill, defaultSkillRoots, discoverSkills } from './skills.ts'
import { readFile } from 'node:fs/promises'

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
      input: { hint: '[list|all|skills|claude|codex|cursor|path]' },
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
            return { ok: true, value: await listSessions(payload as { source?: ImportSource }, maxFileBytes) }
          case 'importSessions':
            return { ok: true, value: await importSessions(connectionCtx, payload as { paths?: string[]; source?: ImportSource; keepCwd?: boolean }, limits, maxFileBytes) }
          case 'listSkills':
            return { ok: true, value: { entries: await discoverSkills(defaultSkillRoots()) } }
          case 'importSkills':
            return { ok: true, value: await importSkills(payload as { paths?: string[] }, skillTarget) }
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
        '/import list [claude|codex|cursor] — discover local sessions',
        '/import all — import every discovered session into this workspace',
        '/import claude|codex|cursor — import one store',
        '/import skills — copy Claude/Codex/Cursor skills into ~/.dsh/skills',
        '/import <path-or-id> — import one file or native id',
        'Add --keep-cwd to keep the foreign working directory instead of this workspace.',
      ].join('\n'),
    }
  }
  if (command.kind === 'list') {
    const rows = await listedSessions(command.source, runtime.maxFileBytes, runtime.signal)
    if (rows.length === 0) return { kind: 'success', text: 'No foreign sessions found.' }
    const lines = rows.slice(0, 40).map(row => (
      `${row.source}\t${row.title}\t${row.nativeId}\t${row.path}`
    ))
    const extra = rows.length > 40 ? `\n… ${String(rows.length - 40)} more` : ''
    return { kind: 'success', text: `Found ${String(rows.length)} session(s).\n${lines.join('\n')}${extra}` }
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
  const rows = await listedSessions(command.source, runtime.maxFileBytes, runtime.signal)
  const selected = query === undefined
    ? rows
    : rows.filter(row => row.nativeId.includes(query) || row.path.includes(query) || row.title.includes(query))
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
  }
  const failed = failures.length === 0 ? '' : `\nFailed:\n${failures.slice(0, 8).join('\n')}`
  return {
    kind: failures.length > 0 && imported === 0 ? 'error' : 'success',
    text: `Imported ${String(imported)}, already present ${String(skipped)}, failed ${String(failures.length)}.${failed}`,
  }
}

async function listedSessions(
  source: ImportSource | undefined,
  maxFileBytes: number,
  signal?: AbortSignal,
): Promise<DiscoveredSession[]> {
  const roots = defaultScanRoots()
  const discovered = await discoverSessions(source === undefined ? roots : {
    claude: source === 'claude' ? roots.claude : [],
    codex: source === 'codex' ? roots.codex : [],
    cursor: source === 'cursor' ? roots.cursor : [],
  }, signal)
  const enriched: DiscoveredSession[] = []
  for (const row of discovered) {
    if (row.bytes > maxFileBytes) continue
    try {
      const preview = await readFile(row.path, 'utf8')
      enriched.push(enrichFromPreview(row, preview))
    } catch {
      enriched.push(row)
    }
  }
  return enriched
}

async function listSessions(
  request: { source?: ImportSource },
  maxFileBytes: number,
): Promise<{ entries: DiscoveredSession[] }> {
  return { entries: await listedSessions(request.source, maxFileBytes) }
}

async function importSessions(
  ctx: Context,
  request: { paths?: string[]; source?: ImportSource; keepCwd?: boolean },
  limits: { maxToolResultChars: number; maxTextChars: number },
  maxFileBytes: number,
): Promise<{ imported: number; skipped: number; failed: { path: string; message: string }[] }> {
  const persistence = requirePersistence(ctx)
  if (persistence === undefined) {
    throw new Error('session persistence is not configured')
  }
  const rows = await listedSessions(request.source, maxFileBytes)
  const selected = request.paths === undefined || request.paths.length === 0
    ? rows
    : rows.filter(row => request.paths!.includes(row.path))
  let imported = 0
  let skipped = 0
  const failed: { path: string; message: string }[] = []
  for (const row of selected) {
    const outcome = await importOne(persistence, row, limits, process.cwd(), request.keepCwd === true)
    if (!outcome.ok) {
      failed.push({ path: row.path, message: outcome.message })
      continue
    }
    if (outcome.alreadyImported) skipped += 1
    else imported += 1
  }
  if (request.paths !== undefined) {
    for (const path of request.paths) {
      if (selected.some(row => row.path === path)) continue
      try {
        const converted = relocate(await convertFile(path, request.source, limits), process.cwd(), request.keepCwd === true)
        const outcome = await persistConverted(persistence, converted)
        if (!outcome.ok) failed.push({ path, message: outcome.message })
        else if (outcome.alreadyImported) skipped += 1
        else imported += 1
      } catch (error) {
        failed.push({ path, message: error instanceof Error ? error.message : String(error) })
      }
    }
  }
  return { imported, skipped, failed }
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
