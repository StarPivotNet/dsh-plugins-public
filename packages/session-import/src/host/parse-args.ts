/** Parse `/import` command input. */

import type { ImportSource } from '../convert/types.ts'

/** One parsed `/import` invocation. */
export type ImportCommand =
  | { readonly kind: 'help' }
  | { readonly kind: 'list'; readonly source?: ImportSource; readonly includeArchived: boolean }
  | { readonly kind: 'sessions'; readonly source?: ImportSource; readonly query?: string; readonly keepCwd: boolean; readonly includeArchived: boolean }
  | { readonly kind: 'skills'; readonly source?: ImportSource }
  | { readonly kind: 'memory' }
  | { readonly kind: 'automations' }

const SOURCES = new Set<ImportSource>(['claude', 'codex', 'cursor', 'grok'])

/** Parse the free-form text after `/import`. */
export function parseImportArgs(rawInput: string): ImportCommand {
  const rawTokens = rawInput.trim().split(/\s+/u).filter(token => token.length > 0)
  const keepCwd = rawTokens.some(token => token === '--keep-cwd')
  const includeArchived = rawTokens.some(token => token === '--archived')
  const tokens = rawTokens.filter(token => token !== '--keep-cwd' && token !== '--archived')
  if (tokens.length === 0) return { kind: 'help' }
  const first = tokens[0]?.toLowerCase()
  if (first === 'help' || first === '--help') return { kind: 'help' }
  if (first === 'list') {
    const source = parseSource(tokens[1])
    return source === undefined && tokens[1] !== undefined
      ? { kind: 'sessions', query: tokens.slice(1).join(' '), keepCwd, includeArchived }
      : { kind: 'list', source, includeArchived }
  }
  if (first === 'skills' || first === 'skill') {
    return { kind: 'skills', source: parseSource(tokens[1]) }
  }
  if (first === 'memory' || first === 'memories' || first === 'agents') {
    return { kind: 'memory' }
  }
  if (first === 'automations' || first === 'automation') {
    return { kind: 'automations' }
  }
  if (first === 'all') return { kind: 'sessions', keepCwd, includeArchived }
  const source = parseSource(first)
  if (source !== undefined) {
    const query = tokens.slice(1).join(' ').trim()
    return query.length === 0
      ? { kind: 'sessions', source, keepCwd, includeArchived }
      : { kind: 'sessions', source, query, keepCwd, includeArchived }
  }
  return { kind: 'sessions', query: tokens.join(' '), keepCwd, includeArchived }
}

/** Parse one source token. */
export function parseSource(value: string | undefined): ImportSource | undefined {
  if (value === undefined) return undefined
  const normalized = value.toLowerCase()
  if (normalized === 'claude-code') return 'claude'
  return SOURCES.has(normalized as ImportSource) ? normalized as ImportSource : undefined
}
