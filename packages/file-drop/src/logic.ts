/** Shared file-drop classification and composer-insert helpers. */

export const IMAGE_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'] as const

export const DEFAULT_MAX_STAGE_BYTES = 8 * 1024 * 1024

/** Files at or above this size insert only a brief summary, never their bytes. */
export const DEFAULT_BRIEF_BYTES = 256 * 1024

/** Browser-declared image MIME the stock composer already accepts. */
export function isImageMediaType(type: string): boolean {
  return (IMAGE_MEDIA_TYPES as readonly string[]).includes(type)
}

/** Last path segment of a POSIX or Windows path. */
export function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || path
}

/** File extension including the leading dot, lowercased. */
export function extname(name: string): string {
  const base = basename(name)
  const dot = base.lastIndexOf('.')
  return dot === -1 ? '' : base.slice(dot).toLowerCase()
}

/** Whether a dropped file looks like a stock-accepted image. */
export function looksLikeImage(file: { name: string; type: string }): boolean {
  return isImageMediaType(file.type) || (IMAGE_EXTENSIONS as readonly string[]).includes(extname(file.name))
}

/**
 * Whether this drop should be stolen from the stock image-only handler.
 * Directories and any non-image file take over; an all-image batch is left alone.
 */
export function shouldTakeOver(
  files: readonly { name?: string; type: string }[],
  hasDirectory: boolean,
): boolean {
  if (hasDirectory) return true
  if (files.length === 0) return false
  return files.some(file => !looksLikeImage({ name: file.name ?? '', type: file.type }))
}

/**
 * Whether capture-phase listeners should steal this transfer.
 * During drag, `FileList` is often empty; only typed non-image items or a
 * directory entry are enough to claim. URI lists are consulted only on drop
 * so Finder image drags keep the stock overlay.
 */
export function shouldClaimTransfer(input: {
  files: readonly { name?: string; type: string }[]
  itemTypes: readonly string[]
  hasDirectory: boolean
  uriListAvailable: boolean
  forDrop: boolean
}): boolean {
  if (input.hasDirectory) return true
  if (input.itemTypes.some(type => type !== '' && !isImageMediaType(type))) return true
  if (input.files.length > 0) return shouldTakeOver(input.files, false)
  return input.forDrop && input.uriListAvailable && input.itemTypes.length === 0 && input.files.length === 0
}

/**
 * Convert a file: URL from text/uri-list into a local path.
 * @returns the path, or null when the URL is not a local file.
 */
export function fileUrlToPath(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed.toLowerCase().startsWith('file:')) return null
  try {
    const parsed = new URL(trimmed)
    let path = decodeURIComponent(parsed.pathname)
    if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1)
    return path
  } catch {
    return null
  }
}

/** Parse a text/uri-list or newline-separated path dump into local paths. */
export function parseUriList(raw: string): string[] {
  const paths: string[] = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue
    const fromUrl = fileUrlToPath(trimmed)
    if (fromUrl !== null) {
      paths.push(fromUrl)
      continue
    }
    if (trimmed.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmed)) paths.push(trimmed)
  }
  return paths
}

/**
 * Resolve one dropped file to a local path.
 * Prefers Electron File.path, then a unique basename match in the URI list.
 */
export function resolveDroppedPath(
  file: { name: string; path?: string },
  uris: readonly string[],
): string | undefined {
  if (typeof file.path === 'string' && file.path.length > 0) return file.path
  const matches = uris.filter(uri => basename(uri) === file.name)
  if (matches.length === 1) return matches[0]
  return undefined
}

/** Quote a path so the composer can round-trip spaces and quotes. */
export function quotePath(path: string): string {
  if (!/[\s"'\\]/.test(path)) return path
  return '"' + path.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

/** One path per line for insertion into the composer. */
export function formatDroppedPaths(paths: readonly string[]): string {
  return paths.map(quotePath).join('\n')
}

/** Human-readable byte count for composer summaries. */
export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown size'
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export interface DroppedFileBrief {
  readonly name: string
  readonly path?: string
  readonly size?: number
  readonly mediaType?: string
  readonly staged?: boolean
  readonly tooLarge?: boolean
}

/** One-line composer card: path plus size; large files stay summary-only. */
export function formatDroppedBrief(file: DroppedFileBrief): string {
  const label = file.path !== undefined ? quotePath(file.path) : file.name
  const size = file.size === undefined ? undefined : formatByteSize(file.size)
  const kind = file.tooLarge ? 'large file' : file.staged ? 'staged file' : undefined
  const extras = [size, kind].filter((value): value is string => value !== undefined)
  if (extras.length === 0) return label
  return `${label} (${extras.join(', ')})`
}

export function formatDroppedBriefs(files: readonly DroppedFileBrief[]): string {
  return files.map(formatDroppedBrief).join('\n')
}

export function isBriefOnly(size: number | undefined, limit = DEFAULT_BRIEF_BYTES): boolean {
  return typeof size === 'number' && size >= limit
}

/**
 * Append a chunk to an existing draft.
 * @returns the next draft and caret at the end of the inserted chunk.
 */
export function joinInsertion(existing: string, chunk: string): { next: string; caret: number } {
  if (chunk.length === 0) return { next: existing, caret: existing.length }
  if (existing.length === 0) return { next: chunk, caret: chunk.length }
  const sep = existing.endsWith('\n') ? '' : '\n'
  const next = existing + sep + chunk
  return { next, caret: next.length }
}

/** One dropped file the interceptor can inspect without the live File object. */
export interface DroppedFile {
  readonly name: string
  readonly type: string
  readonly size?: number
  readonly path?: string
}

/**
 * Split a drop into already-known local paths and files that still need staging.
 * An empty file list still keeps URI-list paths so Finder folder drops work.
 */
export function collectDropPaths(
  files: readonly DroppedFile[],
  uriList: string,
): { known: string[]; missing: DroppedFile[] } {
  const uris = parseUriList(uriList)
  const known: string[] = []
  const missing: DroppedFile[] = []
  const seen = new Set<string>()
  const push = (path: string): void => {
    if (seen.has(path)) return
    seen.add(path)
    known.push(path)
  }
  for (const file of files) {
    const path = resolveDroppedPath(file, uris)
    if (path !== undefined) push(path)
    else missing.push(file)
  }
  if (files.length === 0) {
    for (const path of uris) push(path)
  }
  return { known, missing }
}

/** Sanitize a dropped basename before writing under ~/.dsh/dropped. */
export function safeDroppedName(name: string): string {
  const base = basename(name)
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+$/g, '_')
  if (cleaned.length === 0) return 'dropped.bin'
  return cleaned.slice(0, 120)
}
