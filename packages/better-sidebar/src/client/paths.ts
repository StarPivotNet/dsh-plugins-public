/**
 * Path projection helpers shared by the explorer rows: a path relative to
 * the session cwd or another workspace folder (for the @-reference button
 * and "copy relative path").
 * The fs-tree joins with '/' even on Windows, so both separators normalize
 * to '/' before comparison.
 *
 * This module is dependency-free (no node:path in the client bundle): the
 * host is the authority for path semantics, so this mirror deliberately
 * accepts a SUPERSET of absolute forms — anything a Windows host would emit
 * (drive letters, UNC) plus POSIX roots. A form the host would reject
 * (e.g. a backslash UNC path on a POSIX host) passes through here and then
 * fails loudly in the host's requireAbsolute instead of being silently
 * joined onto the cwd.
 */

/**
 * Mirror of the host's absolute-path notion (see fs-tree.requireAbsolute):
 * POSIX roots, Windows drive letters, and Windows UNC network shares in
 * both backslash (`\\server\share\...`) and forward-slash
 * (`//server/share/...`) form. Deliberately a superset — see the module
 * comment — so a produced UNC path is never joined onto the cwd.
 */
export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path) || /^[\\/]{2}[^\\/]/.test(path)
}

/** Normalize separators so containment tests do not depend on '\\' vs '/'. */
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

/**
 * The path relative to the session's working directory.
 * @param cwd - the explorer root (absolute).
 * @param path - an absolute entry path from the fs-tree.
 * @returns the relative path with '/' separators ('.' for the cwd itself),
 * or `path` unchanged when it lies outside the cwd.
 *
 * The prefix test is case-insensitive: Windows paths (and macOS's
 * case-insensitive volumes) may arrive with different casing than the cwd
 * row, and the containment decision must not depend on it. The returned
 * relative text keeps the caller's own casing.
 */
export function relativeTo(cwd: string, path: string): string {
  const base = cwd.replace(/[\\/]+$/, '')
  const nBase = normalizePath(base)
  const nPath = normalizePath(path)
  if (nPath === nBase) return '.'
  if (nPath.toLowerCase().startsWith(`${nBase.toLowerCase()}/`)) return nPath.slice(nBase.length + 1)
  return path
}

/**
 * Deduplicate workspace roots while keeping the primary cwd first.
 * Additional folders already equal to the cwd (or to an earlier folder)
 * drop out so a one-folder workspace still renders a single tree.
 * @param cwd - the session working directory (primary root).
 * @param folders - additional workspace folders (may be empty).
 * @returns unique absolute roots in display order.
 */
export function workspaceRoots(cwd: string | undefined, folders: readonly string[] = []): string[] {
  const roots: string[] = []
  const seen = new Set<string>()
  const add = (raw: string | undefined): void => {
    if (raw === undefined || raw === '') return
    const key = normalizePath(raw.replace(/[\\/]+$/, '')).toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    roots.push(raw)
  }
  add(cwd)
  for (const folder of folders) add(folder)
  return roots
}

/**
 * The closest workspace root that contains `path`, or undefined when the
 * path sits outside every known folder.
 * @param roots - workspace roots (cwd first).
 * @param path - an absolute filesystem path.
 */
export function containingRoot(roots: readonly string[], path: string): string | undefined {
  let best: string | undefined
  let bestLength = -1
  for (const root of roots) {
    const rel = relativeTo(root, path)
    if (rel === path) continue
    const length = normalizePath(root).length
    if (length > bestLength) {
      best = root
      bestLength = length
    }
  }
  return best
}

/**
 * Project `path` relative to the closest workspace root. Falls back to
 * the first root (the session cwd) so a path outside every folder still
 * uses the same absolute fallback `relativeTo` already had.
 * @param cwd - the session working directory.
 * @param folders - additional workspace folders.
 * @param path - an absolute filesystem path.
 */
export function relativeToWorkspace(cwd: string | undefined, folders: readonly string[], path: string): string {
  const roots = workspaceRoots(cwd, folders)
  const root = containingRoot(roots, path) ?? roots[0]
  return root === undefined ? path : relativeTo(root, path)
}
