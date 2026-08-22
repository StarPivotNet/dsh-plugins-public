import type { BoardColumnId } from './types.ts';
/** Same-origin host route; survives device changes unlike localStorage. */
export declare const COLUMNS_ROUTE = "/plugins/@starpivot/dsh-kanban/columns";
/** Upstream browser key; migrated once into the host file then left unused. */
export declare const LEGACY_STORAGE_KEY = "dsh-kanban.columns.v1";
/** Keep only known column ids. */
export declare function sanitizeColumns(value: unknown): Record<string, BoardColumnId>;
/**
 * Load host-owned column overrides. An empty host file adopts the old
 * localStorage map once so existing placements survive the storage move.
 */
export declare function loadColumnOverrides(): Promise<Record<string, BoardColumnId>>;
/** Persist the full override map on the host. */
export declare function saveColumnOverrides(columns: Record<string, BoardColumnId>): Promise<void>;
