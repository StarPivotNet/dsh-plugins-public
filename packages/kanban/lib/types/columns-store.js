import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
/** On-disk schema for host-owned column overrides. */
export const COLUMNS_SCHEMA_VERSION = 1;
/** Manual placements the live session state does not already force. */
export const COLUMN_IDS = ['inbox', 'ready', 'running', 'blocked', 'done'];
const EMPTY = { schemaVersion: COLUMNS_SCHEMA_VERSION, columns: {} };
/**
 * Keep only known column ids. Unknown keys are dropped so a corrupt file
 * cannot strand the board.
 */
export function sanitizeColumns(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return {};
    const next = {};
    for (const [sessionId, column] of Object.entries(value)) {
        if (sessionId === '')
            continue;
        if (COLUMN_IDS.includes(column)) {
            next[sessionId] = column;
        }
    }
    return next;
}
/**
 * Read the host document. A missing file is an empty board, not an error.
 * @param path - absolute JSON path.
 */
export async function readColumnsDocument(path) {
    let raw;
    try {
        raw = await readFile(path, 'utf8');
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return { ...EMPTY, columns: {} };
        throw error;
    }
    try {
        const parsed = JSON.parse(raw);
        return { schemaVersion: COLUMNS_SCHEMA_VERSION, columns: sanitizeColumns(parsed.columns) };
    }
    catch {
        return { ...EMPTY, columns: {} };
    }
}
/**
 * Atomically replace the host document.
 * @param path - absolute JSON path.
 * @param columns - sanitized overrides to persist.
 */
export async function writeColumnsDocument(path, columns) {
    const document = {
        schemaVersion: COLUMNS_SCHEMA_VERSION,
        columns: sanitizeColumns(columns),
    };
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    await writeFile(tmp, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    await rename(tmp, path);
    return document;
}
