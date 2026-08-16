/** Match Loader entries and reload only replaceable plugins. */

export const SKELETON_ENTRY_IDS = new Set([
  'webserver',
  'connection',
  'client-hmr',
  'modules',
  'api-gateway',
  'api-remotes',
  'web-startup',
  'web-runtime',
  'client-runtime',
  'cordis-host-runner',
  'cordis-client-runner',
  'commands',
  'settings',
  'session',
  'agent',
  'agent-loop',
  'plugin-marketplace',
  'timer',
  'hmr',
  'storage',
  'storage-json',
  'storage-domain',
  'session-persistence-jsonl',
])

export interface ReloadableEntry {
  readonly id: string
  readonly moduleName: string
  readonly enabled: boolean
  fiber?: ReloadFiber
  refresh(): Promise<unknown>
}

export interface ReloadFiber {
  dispose(): Promise<unknown>
  await(): Promise<unknown>
  readonly runtime?: { readonly callback?: unknown } | null
  readonly inertia?: Promise<unknown>
}

export interface ReloadMatch {
  readonly id: string
  readonly moduleName: string
}

export type ReloadMatchResult =
  | { readonly kind: 'all' }
  | { readonly kind: 'one'; readonly entry: ReloadMatch }
  | { readonly kind: 'none'; readonly query: string; readonly suggestions: readonly string[] }
  | { readonly kind: 'ambiguous'; readonly query: string; readonly matches: readonly ReloadMatch[] }

export function packageNameOf(moduleName: string): string {
  if (moduleName.startsWith('@')) {
    const parts = moduleName.split('/')
    return parts.slice(0, 2).join('/')
  }
  return moduleName.split('/')[0] ?? moduleName
}

export function isSkeletonEntry(id: string, moduleName: string): boolean {
  if (SKELETON_ENTRY_IDS.has(id)) return true
  return packageNameOf(moduleName) === '@starpivot/dsh-plugin-marketplace'
}

export function isExtraEntry(moduleName: string, dependencies: readonly string[]): boolean {
  return dependencies.includes(packageNameOf(moduleName))
}

export function normalizeQuery(raw: string): string {
  return raw.trim().toLocaleLowerCase()
}

export function matchReloadTarget(
  entries: readonly ReloadMatch[],
  rawInput: string,
): ReloadMatchResult {
  const query = normalizeQuery(rawInput)
  if (query.length === 0) return { kind: 'all' }
  const exact = entries.filter(entry =>
    entry.id.toLocaleLowerCase() === query || entry.moduleName.toLocaleLowerCase() === query)
  if (exact.length === 1) return { kind: 'one', entry: exact[0]! }
  if (exact.length > 1) return { kind: 'ambiguous', query: rawInput.trim(), matches: exact }
  const suggestions = entries
    .filter(entry => entry.id.toLocaleLowerCase().includes(query) || entry.moduleName.toLocaleLowerCase().includes(query))
    .slice(0, 8)
    .map(entry => entry.id)
  return { kind: 'none', query: rawInput.trim(), suggestions }
}

export function selectReloadEntries(
  entries: readonly ReloadableEntry[],
  matched: Extract<ReloadMatchResult, { kind: 'all' } | { kind: 'one' }>,
  dependencies: readonly string[],
):
  | { readonly ok: true; readonly selected: readonly ReloadableEntry[]; readonly skipped: number }
  | { readonly ok: false; readonly message: string } {
  if (matched.kind === 'one') {
    const entry = entries.find(item => item.id === matched.entry.id)
    if (entry === undefined) return { ok: false, message: `没有匹配 ${JSON.stringify(matched.entry.id)} 的插件。` }
    if (isSkeletonEntry(entry.id, entry.moduleName)) {
      return { ok: false, message: `${entry.id} 是进程骨架，不能热重载。请运行 /reboot。` }
    }
    return { ok: true, selected: [entry], skipped: 0 }
  }
  const selected = entries.filter(entry =>
    entry.enabled
    && !isSkeletonEntry(entry.id, entry.moduleName)
    && isExtraEntry(entry.moduleName, dependencies))
  return { ok: true, selected, skipped: entries.filter(entry => entry.enabled).length - selected.length }
}

export async function reloadHostEntry(
  entry: ReloadableEntry,
  registry?: { delete(callback: unknown): void },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!entry.enabled) return { ok: false, message: `条目 ${entry.id} 已停用` }
  try {
    const fiber = entry.fiber
    if (fiber !== undefined) {
      const callback = fiber.runtime?.callback
      if (registry !== undefined && callback !== undefined) {
        registry.delete(callback)
      } else {
        entry.fiber = undefined
        await fiber.dispose()
      }
      while (fiber.inertia !== undefined) await fiber.inertia
      entry.fiber = undefined
    }
    await entry.refresh()
    await entry.fiber?.await()
    return { ok: true }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}

export async function reloadClientPlugins(port: number | undefined): Promise<string> {
  if (port === undefined || !Number.isInteger(port) || port <= 0) {
    return '已跳过浏览器插件重载（没有 webServer 端口）'
  }
  const response = await fetch(`http://127.0.0.1:${String(port)}/plugins/reload`, { method: 'POST' })
  if (!response.ok) return `浏览器插件重载失败：HTTP ${String(response.status)}`
  return '浏览器插件已重载'
}
