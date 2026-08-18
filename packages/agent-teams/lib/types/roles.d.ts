/**
 * Read-only role routing: map member role names to a hard write-tool deny
 * list applied on spawn, mirroring the opencode-ensemble scout/reviewer
 * isolation habit. A read-only member can read and search the workspace and
 * message the team, but file mutation and shell execution are denied at the
 * tool-filter level (not by prompt convention alone).
 * @module dsh-agent-teams/roles
 */
/** Write-capable tools denied for read-only members, on top of the captain-only tools. */
export declare const READ_ONLY_DENY_TOOLS: readonly string[];
/** Default role tokens treated as read-only. Matched case-insensitively by substring. */
export declare const DEFAULT_READ_ONLY_ROLES: readonly string[];
/**
 * Whether one member role matches a configured read-only role token.
 * @param role - the member's free-form role string.
 * @param readOnlyRoles - configured read-only tokens.
 * @returns true when the role names a read-only token.
 */
export declare function isReadOnlyRole(role: string | undefined, readOnlyRoles: readonly string[]): boolean;
/**
 * The persona suffix a read-only member receives, so the model knows the
 * denial is intentional before it attempts a denied tool call.
 * @returns the read-only working-rule sentence.
 */
export declare function readOnlyPersonaRule(): string;
