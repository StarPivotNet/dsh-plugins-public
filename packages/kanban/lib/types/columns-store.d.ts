/** On-disk schema for host-owned column overrides. */
export declare const COLUMNS_SCHEMA_VERSION = 1;
/** Manual placements the live session state does not already force. */
export declare const COLUMN_IDS: readonly ["inbox", "ready", "running", "blocked", "done"];
/** One workflow column a card can sit in. */
export type ColumnId = (typeof COLUMN_IDS)[number];
/** Session-id → column map persisted on the host. */
export type ColumnOverrides = Record<string, ColumnId>;
/** File payload written under `$DSH_HOME/kanban-columns.json`. */
export interface ColumnsDocument {
    schemaVersion: number;
    columns: ColumnOverrides;
}
/**
 * Keep only known column ids. Unknown keys are dropped so a corrupt file
 * cannot strand the board.
 */
export declare function sanitizeColumns(value: unknown): ColumnOverrides;
/**
 * Read the host document. A missing file is an empty board, not an error.
 * @param path - absolute JSON path.
 */
export declare function readColumnsDocument(path: string): Promise<ColumnsDocument>;
/**
 * Atomically replace the host document.
 * @param path - absolute JSON path.
 * @param columns - sanitized overrides to persist.
 */
export declare function writeColumnsDocument(path: string, columns: unknown): Promise<ColumnsDocument>;
