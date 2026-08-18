/** Create a DSH workspace for an imported session cwd when none exists. */

import { basename } from 'node:path'
import { mkdir } from 'node:fs/promises'

/** Minimal workspace row used while attaching an imported session. */
export interface WorkspaceHandle {
  readonly id?: string
  attachSession?: (sessionId: string) => Promise<void>
}

/** Workspace registry methods the importer calls. */
export interface WorkspaceRegistryHandle {
  resolveByPath?: (path: string) => Promise<WorkspaceHandle | undefined>
  create?: (path: string, title?: string) => Promise<WorkspaceHandle>
  list?: () => readonly WorkspaceHandle[]
}

/** Find a workspace for `cwd`, creating the directory and registry row when missing. */
export async function ensureWorkspace(
  registry: WorkspaceRegistryHandle | undefined,
  cwd: string | undefined,
): Promise<WorkspaceHandle | undefined> {
  if (registry === undefined || cwd === undefined || cwd.length === 0) return registry?.list?.()[0]
  try {
    const existing = await registry.resolveByPath?.(cwd)
    if (existing !== undefined) return existing
  } catch {
    // resolveByPath rejects when the directory is gone; create it below.
  }
  try { await mkdir(cwd, { recursive: true }) }
  catch {
    return registry.list?.()[0]
  }
  try {
    return await registry.create?.(cwd, basename(cwd)) ?? registry.list?.()[0]
  } catch {
    try { return await registry.resolveByPath?.(cwd) }
    catch { return registry.list?.()[0] }
  }
}
