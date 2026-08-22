/**
 * Stall detection for interrupted members that still own claimed work.
 *
 * An idle member with open tasks and an empty inbox is indistinguishable from
 * "still working" unless the captain polls. This module decides when that
 * idle transition should wake the captain.
 * @module dsh-agent-teams/stall
 */
/** One session event, reduced to the fields stall detection reads. */
export interface StallSessionEvent {
    readonly type: string;
    readonly data?: unknown;
}
/** Inputs for one stall verdict. */
export interface StallCheck {
    /** Durable member lifecycle (`removed` members are ignored). */
    readonly memberStatus: string;
    /** Live driver status. */
    readonly activity: string;
    /** Latest `turn/end` reason kind, when the session recorded one. */
    readonly lastTurnEndKind: string | undefined;
    /** Claimed or in_progress task ids assigned to this member. */
    readonly openTaskIds: readonly string[];
    /** Whether the live inbox still has unclaimed follow-ups. */
    readonly pendingInbox: boolean;
    /** Latest captain-inbox stall notice for this member, if any. */
    readonly lastStallNotice?: string;
}
/**
 * Latest `turn/end` reason kind in a session log, walking newest-first.
 * @param events - session events in append order.
 * @returns the reason kind, or undefined when no turn has ended.
 */
export declare function lastTurnEndKind(events: readonly StallSessionEvent[]): string | undefined;
/**
 * Whether an idle member should wake the captain as stalled.
 * @param check - live member, task, and inbox facts.
 * @returns notify plus a short reason token for tests and logs.
 */
export declare function shouldNotifyMemberStall(check: StallCheck): {
    notify: boolean;
    reason: string;
};
/**
 * Latest stall notice for one member in the captain inbox, walking newest-first.
 * @param messages - captain mailbox, oldest first.
 * @param memberName - the stalled member's team name.
 * @param openTaskIds - claimed or in_progress ids still assigned to it.
 * @returns that notice's content when the newest matching stall is still current.
 */
export declare function lastMatchingStallNotice(messages: readonly {
    from: string;
    content: string;
}[], memberName: string, openTaskIds: readonly string[]): string | undefined;
/**
 * Captain-facing stall report. Tasks stay claimed so the same work can resume.
 * @param memberName - the stalled member's team name.
 * @param openTaskIds - claimed or in_progress ids still assigned to it.
 * @returns mailbox / follow-up text.
 */
export declare function stallCaptainMessage(memberName: string, openTaskIds: readonly string[]): string;
