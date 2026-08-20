/**
 * AgentTeams conversation card: a lightweight in-conversation summary shown
 * when a team is created — the captain's name, the member roster with whale
 * avatars, and an entry point that re-activates the top-right activity
 * panel (useful after the floater was closed, or when re-opening an old
 * session for review).
 *
 * The fold anchors to first-party `tool/call` + `tool/result` records for
 * create, add_member, and remove_member. Create opens the Context; later
 * member tools update the same team id through `tool/result.meta`. Those
 * events survive restarts without writing an out-of-repo event type.
 * @module dsh-agent-teams/client/card
 */
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-runtime/client';
import { type AgentTeamsCardMember } from '../card-meta.ts';
/** Final keyed Chat payload for the team summary card. */
export interface AgentTeamsCardData {
    readonly teamId: string;
    /** The captain session that owns this team (panel follows it). */
    readonly captainSessionId: string;
    readonly teamName: string;
    readonly members: readonly AgentTeamsCardMember[];
}
declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
    interface ChatNodeDataMap {
        /** Lightweight team summary card anchoring the conversation. */
        'agent-teams': AgentTeamsCardData;
    }
}
/** Folded team record (the node's business state). */
export interface AgentTeamsNodeState {
    readonly teamId: string;
    readonly name: string;
    readonly captainSessionId: string;
    readonly members: readonly AgentTeamsCardMember[];
    readonly accepted: boolean;
}
/** Fold a team display name the same way the host does for typical ids. */
export declare function foldTeamId(name: string): string;
/** Parse the only create-call fields the historic card owns. */
export declare function parseAgentTeamsCreateArgs(value: string): {
    teamId: string;
    name: string;
} | undefined;
/** Read the durable team id from a create tool result (meta first, then render text). */
export declare function parseCreateResultTeamId(event: {
    readonly data: {
        readonly meta?: unknown;
        readonly message: {
            readonly content: readonly unknown[];
        };
    };
}): string | undefined;
/** Durable first-party tool events folded into one keyed Chat node. */
export declare const agentTeamsCardDefinition: ConversationNodeDefinition<AgentTeamsNodeState>;
