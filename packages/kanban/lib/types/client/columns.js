/** Same-origin host route; survives device changes unlike localStorage. */
export const COLUMNS_ROUTE = '/plugins/@starpivot/dsh-kanban/columns';
/** Upstream browser key; migrated once into the host file then left unused. */
export const LEGACY_STORAGE_KEY = 'dsh-kanban.columns.v1';
const COLUMN_IDS = ['inbox', 'ready', 'running', 'blocked', 'done'];
/** Keep only known column ids. */
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
function loadLegacy() {
    try {
        return sanitizeColumns(JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? '{}'));
    }
    catch {
        return {};
    }
}
/**
 * Load host-owned column overrides. An empty host file adopts the old
 * localStorage map once so existing placements survive the storage move.
 */
export async function loadColumnOverrides() {
    try {
        const response = await fetch(COLUMNS_ROUTE, { cache: 'no-store' });
        if (response.ok) {
            const body = await response.json();
            const columns = sanitizeColumns(body.columns);
            const legacy = loadLegacy();
            if (Object.keys(columns).length === 0 && Object.keys(legacy).length > 0) {
                await saveColumnOverrides(legacy);
                return legacy;
            }
            return columns;
        }
    }
    catch {
        // Host route missing (old process): fall back so the board still opens.
    }
    return loadLegacy();
}
/** Persist the full override map on the host. */
export async function saveColumnOverrides(columns) {
    await fetch(COLUMNS_ROUTE, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ schemaVersion: 1, columns }),
    });
}
