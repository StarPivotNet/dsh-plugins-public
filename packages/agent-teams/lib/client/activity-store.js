/**
 * Shared AgentTeams activity snapshot.
 *
 * The activity panel is the single poller of `/plugins/dsh-agent-teams/state`.
 * Conversation cards subscribe here instead of fetching the route themselves.
 * @module dsh-agent-teams/client/activity-store
 */
const EMPTY = { teams: [], archived: [] };
const listeners = new Set();
let snapshot = EMPTY;
function publish(next) {
    snapshot = next;
    for (const listener of listeners)
        listener();
}
/** Current live+archived snapshot. Stable until the panel publishes a new list. */
export function getActivitySnapshot() {
    return snapshot;
}
/**
 * Subscribe to snapshot publication.
 * @param listener - called after live or archived lists change.
 * @returns disposer.
 */
export function subscribeActivitySnapshot(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
/** Replace the live team list. */
export function setActivityLiveTeams(teams) {
    if (snapshot.teams === teams)
        return;
    publish({ teams, archived: snapshot.archived });
}
/** Replace the archived team list. */
export function setActivityArchivedTeams(teams) {
    if (snapshot.archived === teams)
        return;
    publish({ teams: snapshot.teams, archived: teams });
}
/** Drop both lists (panel unmount / HMR). */
export function resetActivitySnapshot() {
    if (snapshot.teams.length === 0 && snapshot.archived.length === 0)
        return;
    publish(EMPTY);
}
/**
 * Find one team in the live list, then the archived list.
 * @param teamId - durable team id.
 * @param owner - captain session id; empty matches any captain.
 */
export function findActivityTeam(teamId, owner) {
    const match = (team) => team.teamId === teamId && (owner === '' || team.captainSessionId === owner);
    return snapshot.teams.find(match) ?? snapshot.archived.find(match);
}
