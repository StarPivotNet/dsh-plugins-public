/**
 * Durable `tool/result.meta` for the in-conversation team card.
 *
 * The card folds first-party tool events. These records carry the team id and
 * roster so add/remove updates join the create Context after replay, without
 * waiting on the live snapshot route.
 * @module dsh-agent-teams/card-meta
 */
/** Narrow a persisted tool/result meta payload to a card update. */
export function parseAgentTeamsToolMeta(value) {
    if (typeof value !== 'object' || value === null || !('kind' in value) || !('teamId' in value)) {
        return undefined;
    }
    const teamId = value.teamId;
    if (typeof teamId !== 'string' || teamId === '')
        return undefined;
    if (value.kind === 'create') {
        if (!('teamName' in value) || typeof value.teamName !== 'string')
            return undefined;
        if (!('captainSessionId' in value) || typeof value.captainSessionId !== 'string')
            return undefined;
        const members = 'members' in value ? parseMembers(value.members) : [];
        if (members === undefined)
            return undefined;
        return {
            kind: 'create',
            teamId,
            teamName: value.teamName,
            captainSessionId: value.captainSessionId,
            members,
        };
    }
    if (value.kind === 'add-member') {
        if (!('member' in value))
            return undefined;
        const member = parseMember(value.member);
        if (member === undefined)
            return undefined;
        return { kind: 'add-member', teamId, member };
    }
    if (value.kind === 'remove-member') {
        if (!('name' in value) || typeof value.name !== 'string' || value.name === '')
            return undefined;
        return { kind: 'remove-member', teamId, name: value.name };
    }
    return undefined;
}
function parseMembers(value) {
    if (!Array.isArray(value))
        return undefined;
    const members = [];
    for (const entry of value) {
        const member = parseMember(entry);
        if (member === undefined)
            return undefined;
        members.push(member);
    }
    return members;
}
function parseMember(value) {
    if (typeof value !== 'object' || value === null)
        return undefined;
    if (!('id' in value) || typeof value.id !== 'string')
        return undefined;
    if (!('name' in value) || typeof value.name !== 'string' || value.name === '')
        return undefined;
    const role = 'role' in value && typeof value.role === 'string' ? value.role : '';
    return { id: value.id, name: value.name, role };
}
