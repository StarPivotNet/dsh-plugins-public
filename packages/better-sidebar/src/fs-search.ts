/**
 * Recursive file-name search for the editor's merged-mode side panel.
 * Streams the tree with opendir and matches the query as a case-insensitive
 * substring of each entry's NAME (paths stay relative to the search root —
 * the client resolves them against the session cwd). No .gitignore semantics
 * (this is a name lookup, not a code search), but `.git` directories are
 * skipped outright (VCS internals are never useful results) and symlink
 * directories are NOT descended (cycle safety).
 *
 * Two performance budgets bound the walk: `maxMatches` (the client renders
 * the flat list) and `maxVisited` (a runaway tree — a home directory root,
 * a node_modules forest — must not stall the host). Exceeding either stops
 * early with `truncated: true`.
 */
import { opendir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

/** One search: the relative paths of the matching entries (dirs included so
 *  the client can hint where matches live) plus the truncation flag. */
export interface FsSearchResult {
  matches: string[]
  truncated: boolean
}

/** Search budgets (both injectable for tests). */
export interface FsSearchOptions {
  /** Row cap of the result list (default 200). */
  maxMatches?: number
  /** Total entries visited before the walk gives up (default 100_000). */
  maxVisited?: number
}

const DEFAULT_MAX_MATCHES = 200
const DEFAULT_MAX_VISITED = 100_000

/**
 * Search `root` recursively for entries whose name contains `query`
 * (case-insensitive).
 * @param root - absolute search root.
 * @param query - the name substring; empty matches nothing.
 * @param opts - budget overrides (tests).
 * @returns the matching paths RELATIVE to `root` ('/'-separated), sorted,
 *  plus whether a budget cut the walk short. An unreadable level is skipped
 *  (permission errors never fail the whole search).
 */
export async function searchFiles(root: string, query: string, opts: FsSearchOptions = {}): Promise<FsSearchResult> {
  const needle = query.trim().toLowerCase()
  if (needle === '') return { matches: [], truncated: false }
  const maxMatches = opts.maxMatches ?? DEFAULT_MAX_MATCHES
  const maxVisited = opts.maxVisited ?? DEFAULT_MAX_VISITED

  const matches: string[] = []
  let visited = 0
  let truncated = false

  const walk = async (dir: string): Promise<void> => {
    if (truncated) return
    const level = await opendir(dir).catch(() => undefined)
    if (level === undefined) return
    for await (const dirent of level) {
      visited += 1
      if (visited > maxVisited) {
        truncated = true
        return
      }
      // .git is VCS-internal noise: never matched, never descended.
      if (dirent.isDirectory() && dirent.name === '.git') continue
      if (dirent.name.toLowerCase().includes(needle)) {
        matches.push(join(relative(root, dir), dirent.name))
        if (matches.length >= maxMatches) {
          truncated = true
          return
        }
      }
      // Descend real directories only: a symlinked directory may point back
      // up the tree (cycle).
      if (dirent.isDirectory() && !dirent.isSymbolicLink()) {
        await walk(join(dir, dirent.name))
        if (truncated) return
      }
    }
  }
  await walk(root)
  // '/' separators on every platform: the client joins onto the cwd itself.
  return { matches: matches.sort().map(path => path.split(sep).join('/')), truncated }
}

/**
 * Search every workspace root. A single root keeps cwd-relative matches
 * (the historical client contract). Several roots return absolute paths so
 * the client can tell which folder a hit came from. Match and visit
 * budgets are shared across roots.
 */
export async function searchFilesInRoots(
  roots: readonly string[],
  query: string,
  opts: FsSearchOptions = {},
): Promise<FsSearchResult> {
  if (roots.length === 0) return { matches: [], truncated: false }
  if (roots.length === 1) return searchFiles(roots[0]!, query, opts)

  const maxMatches = opts.maxMatches ?? DEFAULT_MAX_MATCHES
  const remaining: string[] = [...roots]
  const matches: string[] = []
  let truncated = false
  while (remaining.length > 0) {
    const root = remaining.shift()!
    const result = await searchFiles(root, query, {
      maxMatches: maxMatches - matches.length,
      maxVisited: opts.maxVisited,
    })
    for (const rel of result.matches) matches.push(absoluteSearchMatch(root, rel))
    if (!result.truncated) continue
    truncated = true
    if (matches.length >= maxMatches) break
    // A visit-budget stop in one root still lets later roots contribute
    // until the shared match cap is hit.
  }
  return { matches: matches.sort(), truncated }
}

/** Join a search-relative path back onto its root as a '/'-separated absolute. */
function absoluteSearchMatch(root: string, rel: string): string {
  if (rel === '' || rel === '.') return root.split(sep).join('/')
  return join(root, ...rel.split('/')).split(sep).join('/')
}
