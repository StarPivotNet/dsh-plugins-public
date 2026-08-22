/**
 * Shared AgentTeams activity snapshot.
 *
 * The activity panel is the single poller of `/plugins/dsh-agent-teams/state`.
 * Conversation cards subscribe here instead of fetching the route themselves.
 * @module dsh-agent-teams/client/activity-store
 */
/** Member fields a conversation card may copy from the live snapshot. */
export interface SharedActivityMember {
    readonly id: string;
    readonly name: string;
    readonly role: string;
}
/** Team fields cards use to enrich the folded roster. */
export interface SharedActivityTeam {
    readonly teamId: string;
    readonly name: string;
    readonly captainSessionId: string;
    readonly members: readonly SharedActivityMember[];
}
/** Live and archived team lists published by the activity panel. */
export interface ActivitySnapshot {
    readonly teams: readonly SharedActivityTeam[];
    readonly archived: readonly SharedActivityTeam[];
}
/** Current live+archived snapshot. Stable until the panel publishes a new list. */
export declare function getActivitySnapshot(): ActivitySnapshot;
/**
 * Subscribe to snapshot publication.
 * @param listener - called after live or archived lists change.
 * @returns disposer.
 */
export declare function subscribeActivitySnapshot(listener: () => void): () => void;
/** Replace the live team list. */
export declare function setActivityLiveTeams(teams: readonly SharedActivityTeam[]): void;
/** Replace the archived team list. */
export declare function setActivityArchivedTeams(teams: readonly SharedActivityTeam[]): void;
/** Drop both lists (panel unmount / HMR). */
export declare function resetActivitySnapshot(): void;
/**
 * Find one team in the live list, then the archived list.
 * @param teamId - durable team id.
 * @param owner - captain session id; empty matches any captain.
 */
export declare function findActivityTeam(teamId: string, owner: string): SharedActivityTeam | undefined;
