import { Kanban } from "./Kanban.js";
export const inject = ['slots', 'sessions', 'workspaces'];
export function apply(ctx) {
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'kanban',
        order: 80,
        inject: () => ({
            openSession: (sessionId) => { ctx.sessions.open(sessionId); },
            clearSession: () => { ctx.sessions.clear(); },
            createTask: async (workspaceId, title, prompt) => {
                const sessionId = await ctx.workspaces.connectWorkspace(workspaceId);
                const binding = ctx.sessions.binding(sessionId);
                if (binding === undefined)
                    throw new Error('新会话尚未就绪');
                const renamed = await binding.session.rename(title);
                if (!renamed.ok)
                    throw new Error(renamed.error.message);
                const sent = await binding.session.prompt([{ type: 'text', text: prompt }], 'queue');
                if (!sent.ok)
                    throw new Error(sent.error.message);
                ctx.sessions.open(sessionId);
                return sessionId;
            },
        }),
    }, Kanban));
}
