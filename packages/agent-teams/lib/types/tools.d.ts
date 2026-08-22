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
import { type TeamDeliveryMode } from './members.ts';
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
 * Deliver a durable member report to the live captain.
 *
 * Barge (default) cancels the current turn first (`keepInbox`) so a new
 * instruction starts immediately. Queue becomes the next FIFO turn and does
 * not abort in-flight captain tools.
 */
export declare function deliverCaptainReport(captain: Pick<Agent, 'cancel' | 'followup'>, from: string, content: string, mode?: TeamDeliveryMode): boolean;
/**
 * Barge a durable member report into the live captain immediately.
 * @deprecated Use {@link deliverCaptainReport} with `mode: 'barge'`.
 */
export declare function bargeCaptainReport(captain: Pick<Agent, 'cancel' | 'followup'>, from: string, content: string): boolean;
/**
 * Resolve the first-turn brief for a new member. `prompt` is the documented
 * field; `brief` / `instructions` / `task_description` / `task_subject` cover
 * XML argument drops that otherwise fail as "missing required property prompt".
 */
export declare function resolveMemberSpawnBrief(args: {
    prompt?: string;
    brief?: string;
    instructions?: string;
    task_description?: string;
    task_subject: string;
}): string;
/** Parse the live-delivery mode. Default is barge so new instructions start now. */
export declare function parseDeliveryMode(value: string | undefined): TeamDeliveryMode;
/**
 * Register every `agent_teams_*` tool into the shared tools registry.
 * @param ctx - the plugin context (injects `tools`).
 * @param config - resolved tool config.
 */
export declare function registerAgentTeamsTools(ctx: Context, config: ToolsConfig): void;
