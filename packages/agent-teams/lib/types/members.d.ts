/**
 * Member subagent lifecycle: spawn a continuable child per member, deliver
 * messages into its FIFO inbox, and observe its activity.
 *
 * Members are durable continuable subagents of the captain, so a member keeps
 * its conversation across turns and across harness restarts: the captain
 * queues or barges in with {@link deliverToMember}, it works through its turn
 * (updating team state through the `agent_teams_*` tools), and becomes idle
 * again. Its final assistant message is not readable programmatically, so the
 * member persists its report into the captain's mailbox and the task records,
 * which the captain reads through `agent_teams_status`.
 * @module dsh-agent-teams/members
 */
import type { Context } from '@deepseek-ai/cordis';
import { type Agent } from '@deepseek-ai/dsh-agent';
import type { TeamMember, TeamState, TeamTask } from './types.ts';
/** Captain-only AgentTeams tools hidden from newly spawned members. */
export declare const MEMBER_DENIED_TOOLS: readonly ["agent_teams_create", "agent_teams_add_member", "agent_teams_remove_member", "agent_teams_create_task", "agent_teams_delete", "agent_teams_report_issue"];
/** Runtime knobs for member spawning, resolved from plugin config. */
export interface MemberRuntimeConfig {
    /** Registered `ctx.subagents` provider name (must support continuable + persona). */
    provider: string;
    /** Child delegation depth cap (0 forbids delegation entirely). */
    maxDepth?: number;
    /** Role tokens whose members additionally deny write-capable tools. */
    readOnlyRoles?: readonly string[];
}
/** Durable provider/model/reasoning snapshot for one member. */
export interface MemberLlmSelection {
    /** Registered LLM provider route. */
    provider: string;
    /** Provider-owned model id. */
    model: string;
    /** Adapter-owned reasoning effort, absent when the target has no explicit/default effort. */
    reasoningEffort?: string;
}
/** Optional member-level route requested by the captain. */
export interface MemberLlmSelectionRequest {
    /** Explicit LLM provider route; requires an explicit model. */
    provider?: string;
    /** Explicit model id; otherwise the plugin default or captain model is used. */
    model?: string;
    /** Plugin-level member model default. */
    defaultModel?: string;
}
/** Process-local bridge between spawn admission and synchronous child setup. */
export interface MemberSelectionRuntime {
    /** Make one selection visible while Harness materializes the fresh child. */
    withPending<T>(parentSessionId: string, label: string, selection: MemberLlmSelection, operation: () => Promise<T>): Promise<T>;
}
/**
 * Resolve one member's complete model selection. Ordinary members snapshot the
 * captain's current request route and reasoning effort. An explicit member
 * provider/model or plugin-level model replaces only that route; the current
 * captain effort remains the inherited policy and is validated against the
 * target model before a child is created.
 */
export declare function resolveMemberLlmSelection(ctx: Context, captain: Agent, request: MemberLlmSelectionRequest, signal?: AbortSignal): Promise<MemberLlmSelection>;
/**
 * Install the member selection bridge for every fresh or cold-resumed
 * continuable child. Fresh creation reads the pending in-memory selection;
 * cold resume restores the same selection from the owning team's durable
 * record. Legacy members without a complete saved route retain Harness's
 * descriptor provider/model behavior.
 */
export declare function installMemberSelectionRuntime(ctx: Context, stateDir: string): MemberSelectionRuntime;
/**
 * Open claimed/in_progress tasks assigned to one member, in board order.
 * @param team - the live team record.
 * @param memberName - the member's team name.
 * @returns that member's unfinished owned tasks.
 */
export declare function assignedOpenTasks(team: TeamState, memberName: string): TeamTask[];
/**
 * Compact text listing one member's open work. Empty when nothing is assigned.
 * @param team - the live team record.
 * @param memberName - the member's team name.
 * @returns a heading plus one line per open task, or an empty string.
 */
export declare function assignedWorkBlock(team: TeamState, memberName: string): string;
/**
 * The member's system prompt (persona), shadowing the deployment persona for
 * that child. Self-contained: it replaces the whole persona section.
 * @param team - the team the member joined.
 * @param member - the member record (name/role are read before spawning).
 * @param stateDir - configured state directory, so the member can locate the
 *   team files with its own file tools.
 * @param readOnlyRoles - role tokens that additionally deny write tools.
 * @param workspaceRoot - absolute working directory the member must stay in.
 */
export declare function memberPersona(team: TeamState, member: TeamMember, stateDir: string, readOnlyRoles?: readonly string[], workspaceRoot?: string): string;
/**
 * The initial user message delivered when the member is created.
 * This is the first work turn, not a greeting: the runtime requires a
 * prompt at spawn, so the captain supplies the first assigned task here.
 * @param team - the team the member joined.
 * @param task - the claimed first task.
 * @param brief - captain instructions for that task.
 * @param workspaceRoot - absolute working directory the member must stay in.
 */
export declare function memberDispatchPrompt(team: TeamState, task: TeamTask, brief: string, workspaceRoot?: string): string;
/**
 * Spawn one member as a durable continuable subagent of the captain and fill
 * `member.id` with its child session id. On failure nothing is persisted.
 * @param ctx - the plugin context (injects `subagents`).
 * @param config - member runtime knobs.
 * @param selections - fresh/cold child model-selection bridge.
 * @param llmSelection - resolved provider/model/reasoning snapshot.
 * @param captain - the exact live captain agent (the calling agent).
 * @param team - the team record (read-only here).
 * @param member - the member draft whose `id` is filled on success.
 * @param stateDir - configured state directory (for the persona).
 * @param signal - caller cancellation, forwarded to the start.
 * @param firstTask - the claimed first task that becomes the spawn prompt.
 * @param brief - captain instructions delivered as the first user message.
 * @param worktree - optional absolute git worktree the member is spawned
 *   inside for write isolation; read-only roles refuse it.
 * @param cwd - optional absolute working directory when no worktree is used.
 */
export declare function spawnMember(ctx: Context, config: MemberRuntimeConfig, selections: MemberSelectionRuntime, llmSelection: MemberLlmSelection, captain: Agent, team: TeamState, member: TeamMember, stateDir: string, signal: AbortSignal, firstTask: TeamTask, brief: string, worktree?: string, cwd?: string): Promise<void>;
/** How a live team message reaches a running recipient. */
export type TeamDeliveryMode = 'queue' | 'barge';
/**
 * Deliver one message to a member. Barge (default) interrupts the current
 * turn so a new instruction starts immediately. Queue becomes the next FIFO
 * turn and does not abort in-flight tools.
 *
 * Best effort: a failure (member gone or not continuable) is logged and
 * reported as `false` so the caller can decide (mailbox delivery still
 * happened).
 *
 * Any team sender can route through this helper: the captain is the direct
 * parent of every member, and the caller passes the captain's live Agent
 * (its own when the captain calls, the registry-resolved one when a member
 * sends).
 * @param ctx - the plugin context (injects `subagents`).
 * @param captain - the exact live captain agent (the member's direct parent).
 * @param childId - the member's durable child session id.
 * @param text - the message content.
 * @param signal - caller cancellation, forwarded to the delivery.
 * @param mode - queue behind the current turn, or barge into it.
 * @returns whether the member inbox accepted the message.
 */
export declare function deliverToMember(ctx: Context, captain: Agent, childId: string, text: string, signal: AbortSignal, mode?: TeamDeliveryMode): Promise<boolean>;
/**
 * Request cancellation of one live member's current turn. Best effort, fire
 * and return; the target may keep running until it observes the signal.
 * @param ctx - the plugin context (injects `subagents`).
 * @param captain - the exact live captain agent (the member's parent).
 * @param childId - the member's durable child session id.
 */
export declare function interruptMember(ctx: Context, captain: Agent, childId: string): void;
/**
 * Stop a member and drop every queued follow-up so stale team messages
 * cannot keep waking it after teardown.
 * @param ctx - the plugin context (injects `agents`).
 * @param childId - the member's durable child session id.
 */
export declare function retireMember(ctx: Context, childId: string): void;
/**
 * Turn activity for one listed child.
 *
 * `listChildren().activity` is a store snapshot: `running` means the child
 * session is still live in `ctx.sessions`, and `inactive` means it exists
 * only in persistence. A stopped conversation stays loaded, so the panel
 * must not treat that store bit as "the member is working". Only a live
 * Agent whose driver is currently `running` is working; idle, ready, or
 * missing live Agents are inactive.
 * @param ctx - the plugin context (injects `agents`).
 * @param childId - the child's durable session id.
 * @returns `running` while the child is driving a turn, otherwise `inactive`.
 */
export declare function turnActivityOf(ctx: Context, childId: string): 'running' | 'inactive';
/**
 * Snapshot each direct continuable child's turn activity under the captain's
 * session, keyed by child session id. A member that is currently running its
 * turn reports `running`; a loaded-but-stopped or cold member reports
 * `inactive`.
 * @param ctx - the plugin context (injects `subagents` and `agents`).
 * @param captainSessionId - the captain's session id.
 * @param signal - optional abort forwarded to `listChildren`.
 * @returns child id → activity, missing entries are unknown children.
 */
export declare function memberActivity(ctx: Context, captainSessionId: string, signal?: AbortSignal): Promise<Map<string, 'running' | 'inactive'>>;
