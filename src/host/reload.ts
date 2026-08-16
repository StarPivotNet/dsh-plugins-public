/** Match Loader entries and reload them without marking the row disabled. */

export interface ReloadableEntry {
  readonly id: string
  readonly moduleName: string
  readonly enabled: boolean
  fiber: { dispose(): Promise<unknown>; await(): Promise<unknown> } | undefined
  refresh(): Promise<unknown>
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

export async function reloadHostEntry(entry: ReloadableEntry): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!entry.enabled) return { ok: false, message: `条目 ${entry.id} 已停用` }
  try {
    const fiber = entry.fiber
    if (fiber !== undefined) {
      // Drop the runtime first. Disposing the fiber while it is still the
      // entry's current runtime trips the Loader self-dispose path and marks
      // the row disabled.
      entry.fiber = undefined
      await fiber.dispose()
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
