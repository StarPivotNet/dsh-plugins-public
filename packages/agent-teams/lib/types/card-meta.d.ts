/**
 * Durable `tool/result.meta` for the in-conversation team card.
 *
 * The card folds first-party tool events. These records carry the team id and
 * roster so add/remove updates join the create Context after replay, without
 * waiting on the live snapshot route.
 * @module dsh-agent-teams/card-meta
 */
/** One roster row the conversation card can render. */
export interface AgentTeamsCardMember {
    readonly id: string;
    readonly name: string;
    readonly role: string;
}
/** Create result: empty roster plus the captain session the panel follows. */
export interface AgentTeamsCreateMeta {
    readonly kind: 'create';
    readonly teamId: string;
    readonly teamName: string;
    readonly captainSessionId: string;
    readonly members: readonly AgentTeamsCardMember[];
}
/** Successful add_member result. */
export interface AgentTeamsAddMemberMeta {
    readonly kind: 'add-member';
    readonly teamId: string;
    readonly member: AgentTeamsCardMember;
}
/** Successful remove_member result. */
export interface AgentTeamsRemoveMemberMeta {
    readonly kind: 'remove-member';
    readonly teamId: string;
    readonly name: string;
}
/** Presentation metadata persisted on AgentTeams tool results. */
export type AgentTeamsToolMeta = AgentTeamsCreateMeta | AgentTeamsAddMemberMeta | AgentTeamsRemoveMemberMeta;
/** Narrow a persisted tool/result meta payload to a card update. */
export declare function parseAgentTeamsToolMeta(value: unknown): AgentTeamsToolMeta | undefined;
