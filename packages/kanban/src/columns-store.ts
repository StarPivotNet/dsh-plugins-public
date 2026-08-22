import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** On-disk schema for host-owned column overrides. */
export const COLUMNS_SCHEMA_VERSION = 1

/** Manual placements the live session state does not already force. */
export const COLUMN_IDS = ['inbox', 'ready', 'running', 'blocked', 'done'] as const

/** One workflow column a card can sit in. */
export type ColumnId = (typeof COLUMN_IDS)[number]

/** Session-id → column map persisted on the host. */
export type ColumnOverrides = Record<string, ColumnId>

/** File payload written under `$DSH_HOME/kanban-columns.json`. */
export interface ColumnsDocument {
  schemaVersion: number
  columns: ColumnOverrides
}

const EMPTY: ColumnsDocument = { schemaVersion: COLUMNS_SCHEMA_VERSION, columns: {} }

/**
 * Keep only known column ids. Unknown keys are dropped so a corrupt file
 * cannot strand the board.
 */
export function sanitizeColumns(value: unknown): ColumnOverrides {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const next: ColumnOverrides = {}
  for (const [sessionId, column] of Object.entries(value)) {
    if (sessionId === '') continue
    if ((COLUMN_IDS as readonly string[]).includes(column as string)) {
      next[sessionId] = column as ColumnId
    }
  }
  return next
}

/**
 * Read the host document. A missing file is an empty board, not an error.
 * @param path - absolute JSON path.
 */
export async function readColumnsDocument(path: string): Promise<ColumnsDocument> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ...EMPTY, columns: {} }
    throw error
  }
  try {
    const parsed = JSON.parse(raw) as { columns?: unknown }
    return { schemaVersion: COLUMNS_SCHEMA_VERSION, columns: sanitizeColumns(parsed.columns) }
  } catch {
    return { ...EMPTY, columns: {} }
  }
}

/**
 * Atomically replace the host document.
 * @param path - absolute JSON path.
 * @param columns - sanitized overrides to persist.
 */
export async function writeColumnsDocument(path: string, columns: unknown): Promise<ColumnsDocument> {
  const document: ColumnsDocument = {
    schemaVersion: COLUMNS_SCHEMA_VERSION,
    columns: sanitizeColumns(columns),
  }
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  await writeFile(tmp, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
  await rename(tmp, path)
  return document
}
