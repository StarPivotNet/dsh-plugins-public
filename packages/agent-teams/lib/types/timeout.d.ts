/**
 * Bounded waits for snapshot assembly. A hung listChildren or mailbox read
 * must not stall the activity HTTP route.
 * @module dsh-agent-teams/timeout
 */
/** Bound for one captain's live activity listing. */
export declare const ACTIVITY_LIST_TIMEOUT_MS = 1500;
/** Bound for the whole snapshot HTTP handler. */
export declare const SNAPSHOT_ROUTE_TIMEOUT_MS = 4000;
/**
 * Reject when `work` does not settle before `ms`.
 * @param work - the awaited operation.
 * @param ms - timeout in milliseconds.
 * @param message - rejection message.
 */
export declare function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T>;
