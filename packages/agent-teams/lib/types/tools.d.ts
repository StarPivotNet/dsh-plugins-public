/**
 * The `agent_teams_*` model-facing tools.
 *
 * The captain (the agent that created the team) orchestrates: members are
 * continuable subagents it spawns and wakes. Members share the same tools and
 * drive their own task state, mirroring the Claude Code AgentTeams flow:
 * create team → add members (first claimed task) → later tasks with returned ids → claim/assign →
 * work → report → status → delete.
 * @module dsh-agent-teams/tools
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/** Resolved plugin config consumed by the tools. */
export interface ToolsConfig {
    /** State directory name under the captain's workspace. */
    stateDir: string;
    /** Member subagent provider name. */
    memberProvider: string;
    /** Optional member model override. */
    memberModel?: string;
    /** Member delegation depth cap. */
    memberMaxDepth?: number;
    /** Team size cap (members). */
    maxMembers: number;
    /** Role tokens whose members deny write/edit/bash on spawn. */
    readOnlyRoles: readonly string[];
}
/**
 * Barge a durable member report into the live captain immediately.
 *
 * A running captain is cancelled first (`keepInbox`) so the report starts a
 * new turn instead of waiting at the next step or behind the current
 * orchestration turn. An idle captain just receives the follow-up.
 */
export declare function bargeCaptainReport(captain: Pick<Agent, 'cancel' | 'followup'>, from: string, content: string): boolean;
/**
 * Register every `agent_teams_*` tool into the shared tools registry.
 * @param ctx - the plugin context (injects `tools`).
 * @param config - resolved tool config.
 */
export declare function registerAgentTeamsTools(ctx: Context, config: ToolsConfig): void;
