import { isInstallVersion, isRegistryPackageName } from './names.ts'
import type { CatalogPlugin, CatalogPluginKind, CatalogSnapshot } from './types.ts'

export const MAX_CATALOG_BYTES = 256 * 1024
const KINDS = new Set<CatalogPluginKind>(['bundle', 'plugin'])

export function parseCatalogDocument(raw: unknown):
  | { readonly ok: true; readonly snapshot: CatalogSnapshot }
  | { readonly ok: false; readonly message: string } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'catalog root must be an object' }
  }
  const document = raw as Record<string, unknown>
  if (document.version !== 1) return { ok: false, message: 'catalog version must be 1' }
  if (!Array.isArray(document.plugins)) return { ok: false, message: 'catalog plugins must be an array' }
  const entries: CatalogPlugin[] = []
  const seen = new Set<string>()
  for (const [index, item] of document.plugins.entries()) {
    const parsed = parseListing(item, index)
    if (!parsed.ok) return parsed
    if (seen.has(parsed.entry.name)) {
      return { ok: false, message: `catalog lists ${parsed.entry.name} more than once` }
    }
    seen.add(parsed.entry.name)
    entries.push(parsed.entry)
  }
  return { ok: true, snapshot: { configured: true, entries } }
}

function parseListing(
  item: unknown,
  index: number,
): { readonly ok: true; readonly entry: CatalogPlugin } | { readonly ok: false; readonly message: string } {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    return { ok: false, message: `catalog plugins[${String(index)}] must be an object` }
  }
  const row = item as Record<string, unknown>
  if (typeof row.name !== 'string' || !isRegistryPackageName(row.name)) {
    return { ok: false, message: `catalog plugins[${String(index)}] has an invalid name` }
  }
  const version = row.version === undefined ? '' : row.version
  if (typeof version !== 'string' || (version.length > 0 && !isInstallVersion(version))) {
    return { ok: false, message: `catalog plugins[${String(index)}] has an invalid version` }
  }
  if (typeof row.title !== 'string' || row.title.trim().length === 0) {
    return { ok: false, message: `catalog plugins[${String(index)}] needs a title` }
  }
  if (typeof row.description !== 'string') {
    return { ok: false, message: `catalog plugins[${String(index)}] needs a description` }
  }
  const homepage = row.homepage === undefined ? '' : row.homepage
  if (typeof homepage !== 'string') {
    return { ok: false, message: `catalog plugins[${String(index)}] homepage must be a string` }
  }
  if (homepage.length > 0) {
    let url: URL
    try { url = new URL(homepage) }
    catch { return { ok: false, message: `catalog plugins[${String(index)}] homepage is not a URL` } }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, message: `catalog plugins[${String(index)}] homepage must be http(s)` }
    }
  }
  if (typeof row.kind !== 'string' || !KINDS.has(row.kind as CatalogPluginKind)) {
    return { ok: false, message: `catalog plugins[${String(index)}] kind must be bundle or plugin` }
  }
  return {
    ok: true,
    entry: {
      name: row.name,
      version,
      title: row.title.trim(),
      description: row.description,
      homepage,
      kind: row.kind as CatalogPluginKind,
    },
  }
}

export function isCatalogUrl(catalogUrl: string): boolean {
  if (catalogUrl.length === 0) return true
  try {
    const url = new URL(catalogUrl)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
