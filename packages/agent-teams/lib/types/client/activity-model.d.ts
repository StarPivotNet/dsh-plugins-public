/** Pure relationship projections used by the AgentTeams activity panel. */
/** Minimum task shape needed to derive dependency relationships. */
export interface RelationshipTask {
    readonly id: string;
    readonly dependencies: readonly string[];
    readonly depth: number;
}
/** One dependency-depth stage in stable display order. */
export interface RelationshipStage<T extends RelationshipTask> {
    readonly depth: number;
    readonly tasks: readonly T[];
}
/**
 * Whether an expanded activity panel still belongs to the current session.
 *
 * The panel is mounted through a body portal, so React does not remount it
 * when the conversation route changes. Ownership keeps an expanded panel
 * from leaking onto the new-session screen (or another conversation) while
 * its local open state is being reset.
 */
export declare function activityPanelExpandedForSession(open: boolean, owner: string | undefined, current: string | undefined): boolean;
/** Bound for one browser snapshot fetch. */
export declare const STATE_FETCH_TIMEOUT_MS = 2500;
/**
 * Fetch JSON with an abort timeout. A hung host must not freeze the card
 * on its empty fold.
 * @param url - snapshot URL.
 * @param timeoutMs - abort after this many milliseconds.
 */
export declare function fetchJsonWithTimeout(url: string, timeoutMs?: number): Promise<{
    ok: boolean;
    json: unknown;
}>;
/** Group tasks by their precomputed dependency depth. */
export declare function taskStages<T extends RelationshipTask>(tasks: readonly T[]): readonly RelationshipStage<T>[];
/**
 * Return the complete upstream/downstream chain around one task.
 *
 * Traversal uses both dependency directions and remains cycle-safe, so the UI
 * can highlight every handoff related to the focused task even if malformed
 * durable data contains a cycle.
 */
export declare function relatedTaskIds(taskId: string, tasks: readonly RelationshipTask[]): ReadonlySet<string>;
