import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, IconChecklistOutline14, IconCloseOutline16, IconNewChatOutline16, IconPlusOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { loadColumnOverrides, saveColumnOverrides } from "./columns.js";
import css from './Kanban.module.css';
const columns = [
    { id: 'inbox', label: '收件箱' },
    { id: 'ready', label: '待开始' },
    { id: 'running', label: '进行中' },
    { id: 'blocked', label: '需处理' },
    { id: 'done', label: '已完成' },
];
const kanbanPath = '/kanban';
function isKanbanRoute() {
    return window.location.pathname === kanbanPath;
}
function automaticColumn(session) {
    if (session.pendingInteraction !== undefined)
        return 'blocked';
    if (session.running)
        return 'running';
    if (session.completed)
        return 'done';
    if (session.blank)
        return 'inbox';
    return 'ready';
}
function relativeTime(time) {
    const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
    if (seconds < 60)
        return '刚刚';
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)} 分钟前`;
    if (seconds < 86400)
        return `${Math.floor(seconds / 3600)} 小时前`;
    return `${Math.floor(seconds / 86400)} 天前`;
}
export function Kanban({ wide, useSessions, useWorkspaces, openSession, clearSession, createTask }) {
    const sessions = useSessions(state => state);
    const workspaces = useWorkspaces(state => state.items);
    const archivedSessionIds = useWorkspaces(state => state.archivedSessionIds);
    const [open, setOpen] = useState(isKanbanRoute);
    const [pageHost, setPageHost] = useState(null);
    const previousSession = useRef(sessions.current);
    const routeSessionCleared = useRef(false);
    const [creating, setCreating] = useState(false);
    const [overrides, setOverrides] = useState({});
    const [query, setQuery] = useState('');
    const [workspaceId, setWorkspaceId] = useState('');
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [error, setError] = useState('');
    const archived = useMemo(() => new Set(archivedSessionIds), [archivedSessionIds]);
    const active = useMemo(() => sessions.ids
        .map(id => sessions.byId[id])
        .filter((session) => session !== undefined)
        .filter(session => session.origin !== 'subagent' && !session.blank && !archived.has(session.id)), [sessions, archived]);
    const visible = useMemo(() => active
        .filter(session => query === '' || `${session.displayTitle} ${session.cwd ?? ''}`.toLowerCase().includes(query.toLowerCase())), [active, query]);
    useEffect(() => {
        let cancelled = false;
        void loadColumnOverrides().then((columns) => {
            if (!cancelled)
                setOverrides(columns);
        });
        return () => { cancelled = true; };
    }, []);
    useEffect(() => {
        const syncRoute = () => {
            const next = isKanbanRoute();
            if (next) {
                previousSession.current = sessions.current;
                routeSessionCleared.current = false;
            }
            else if (open && sessions.current === undefined && previousSession.current !== undefined) {
                openSession(previousSession.current);
            }
            setOpen(next);
        };
        window.addEventListener('popstate', syncRoute);
        return () => window.removeEventListener('popstate', syncRoute);
    }, [open, openSession, sessions.current]);
    useEffect(() => {
        if (!open) {
            setPageHost(null);
            return;
        }
        const conversation = document.querySelector('[data-conversation-scroll]')?.parentElement;
        const host = conversation?.parentElement;
        if (conversation === undefined || conversation === null || host === undefined || host === null)
            return;
        const previous = conversation.style.display;
        conversation.style.display = 'none';
        setPageHost(host);
        return () => {
            conversation.style.display = previous;
        };
    }, [open]);
    useEffect(() => {
        if (!open || sessions.phase !== 'ready')
            return;
        if (!routeSessionCleared.current) {
            previousSession.current = sessions.current;
            clearSession();
            routeSessionCleared.current = true;
            return;
        }
        if (sessions.current !== undefined) {
            window.history.replaceState(window.history.state, '', '/');
            setOpen(false);
        }
    }, [clearSession, open, sessions.current, sessions.phase]);
    const showBoard = () => {
        if (open)
            return;
        previousSession.current = sessions.current;
        routeSessionCleared.current = true;
        window.history.pushState({ ...window.history.state, kanban: true }, '', kanbanPath);
        clearSession();
        setOpen(true);
    };
    const showSession = (sessionId) => {
        window.history.replaceState(window.history.state, '', '/');
        setOpen(false);
        openSession(sessionId);
    };
    const move = (sessionId, column) => {
        const session = sessions.byId[sessionId];
        if (session === undefined || session.running || session.pendingInteraction !== undefined)
            return;
        const next = { ...overrides, [sessionId]: column };
        setOverrides(next);
        void saveColumnOverrides(next);
    };
    const submit = async (event) => {
        event.preventDefault();
        if (workspaceId === '' || title.trim() === '' || prompt.trim() === '')
            return;
        setError('');
        try {
            await createTask(workspaceId, title.trim(), prompt.trim());
            setCreating(false);
            setTitle('');
            setPrompt('');
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        }
    };
    return (_jsxs("div", { className: `${css.entry} ${wide ? '' : css.rail}`, children: [_jsxs("button", { type: "button", className: `${css.trigger} ${open ? css.triggerActive : ''}`, "aria-label": "\u6253\u5F00\u4EFB\u52A1\u770B\u677F", "aria-current": open ? 'page' : undefined, onClick: showBoard, children: [_jsx(IconChecklistOutline14, { size: 16 }), wide && _jsx("span", { children: "\u4EFB\u52A1\u770B\u677F" }), wide && _jsx("span", { className: css.total, children: active.length })] }), open && pageHost !== null && createPortal(_jsxs("main", { className: css.page, lang: "zh-CN", "aria-label": "\u4EFB\u52A1\u770B\u677F", children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { className: css.heading, children: [_jsx("span", { className: css.mark, children: _jsx(IconChecklistOutline14, { size: 18 }) }), _jsxs("div", { children: [_jsx("h1", { children: "\u4EFB\u52A1\u770B\u677F" }), _jsx("p", { children: "DeepSeek Harness \u4F1A\u8BDD\u5DE5\u4F5C\u6D41" })] })] }), _jsxs("div", { className: css.headerActions, children: [_jsxs("label", { className: css.search, children: [_jsx("span", { children: "\u2315" }), _jsx("input", { value: query, onChange: event => setQuery(event.target.value), placeholder: "\u641C\u7D22\u4EFB\u52A1", "aria-label": "\u641C\u7D22\u4EFB\u52A1" })] }), _jsx(Button, { variant: "primary", size: "sm", icon: _jsx(IconPlusOutline16, { size: 14 }), onClick: () => setCreating(true), children: "\u65B0\u5EFA\u4EFB\u52A1" })] })] }), _jsx("div", { className: css.board, children: columns.map(column => {
                            const items = visible.filter(session => {
                                const automatic = automaticColumn(session);
                                const resolved = session.running || session.pendingInteraction !== undefined || session.completed
                                    ? automatic
                                    : overrides[session.id] ?? automatic;
                                return resolved === column.id;
                            });
                            return (_jsxs("section", { className: css.column, "data-column": column.id, onDragOver: (event) => event.preventDefault(), onDrop: (event) => {
                                    event.preventDefault();
                                    move(event.dataTransfer.getData('text/plain'), column.id);
                                }, children: [_jsxs("header", { className: css.columnHeader, children: [_jsx("span", { className: css.dot }), _jsx("h2", { children: column.label }), _jsx("span", { className: css.columnCount, children: items.length }), column.id !== 'done' && _jsx("button", { type: "button", className: css.columnAdd, "aria-label": `在${column.label}中新建任务`, onClick: () => setCreating(true), children: _jsx(IconPlusOutline16, { size: 14 }) })] }), _jsxs("div", { className: css.cards, children: [items.map(session => (_jsxs("article", { role: "button", tabIndex: 0, className: css.card, draggable: !session.running && session.pendingInteraction === undefined, "aria-disabled": session.running || session.pendingInteraction !== undefined, "data-locked": session.running || session.pendingInteraction !== undefined || undefined, onDragStart: event => event.dataTransfer.setData('text/plain', session.id), onClick: () => showSession(session.id), onKeyDown: event => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        showSession(session.id);
                                                    }
                                                }, children: [_jsxs("div", { className: css.cardTop, children: [_jsx("span", { className: css.cardStatus, children: session.running ? '执行中' : session.pendingInteraction !== undefined ? '等待输入' : session.completed ? '已完成' : '会话' }), _jsx("span", { className: css.time, children: relativeTime(session.updatedAt) })] }), _jsx("h3", { children: session.blank ? '新任务' : session.displayTitle }), _jsx("p", { children: session.cwd ?? '未关联工作区' }), _jsxs("footer", { children: [_jsx("span", { children: session.agentPreset ?? 'default' }), session.running && _jsx("span", { className: css.live, children: "\u25CF LIVE" })] })] }, session.id))), items.length === 0 && _jsx("div", { className: css.empty, children: "\u62D6\u52A8\u4EFB\u52A1\u5230\u8FD9\u91CC" })] })] }, column.id));
                        }) }), _jsxs("footer", { className: css.boardFooter, children: [_jsxs("span", { children: [_jsx("i", { className: css.syncDot }), " \u5DF2\u8FDE\u63A5 Harness"] }), _jsxs("span", { children: [visible.length, " \u4E2A\u4EFB\u52A1"] })] }), creating && (_jsx("div", { className: css.createLayer, children: _jsxs("form", { className: css.createCard, onSubmit: submit, children: [_jsxs("div", { className: css.createHead, children: [_jsxs("div", { children: [_jsx(IconNewChatOutline16, { size: 18 }), _jsx("h2", { children: "\u65B0\u5EFA\u4EFB\u52A1" })] }), _jsx("button", { type: "button", "aria-label": "\u5173\u95ED\u65B0\u5EFA\u4EFB\u52A1", onClick: () => setCreating(false), children: _jsx(IconCloseOutline16, { size: 16 }) })] }), _jsxs("label", { children: ["\u5DE5\u4F5C\u533A", _jsxs("select", { value: workspaceId, onChange: event => setWorkspaceId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "\u9009\u62E9\u5DE5\u4F5C\u533A" }), workspaces.map(workspace => _jsx("option", { value: workspace.workspaceId, children: workspace.title }, workspace.workspaceId))] })] }), _jsxs("label", { children: ["\u4EFB\u52A1\u6807\u9898", _jsx("input", { value: title, onChange: event => setTitle(event.target.value), placeholder: "\u4F8B\u5982\uFF1A\u4FEE\u590D\u767B\u5F55\u56DE\u5F52", required: true })] }), _jsxs("label", { children: ["\u4EA4\u7ED9 DeepSeek \u7684\u4EFB\u52A1", _jsx("textarea", { value: prompt, onChange: event => setPrompt(event.target.value), placeholder: "\u63CF\u8FF0\u76EE\u6807\u3001\u7EA6\u675F\u548C\u9A8C\u6536\u6761\u4EF6", rows: 6, required: true })] }), error !== '' && _jsx("p", { className: css.error, children: error }), _jsxs("div", { className: css.createActions, children: [_jsx(Button, { size: "sm", onClick: () => setCreating(false), children: "\u53D6\u6D88" }), _jsx(Button, { type: "submit", variant: "primary", size: "sm", disabled: workspaceId === '' || title.trim() === '' || prompt.trim() === '', children: "\u521B\u5EFA\u5E76\u8FD0\u884C" })] })] }) }))] }), pageHost)] }));
}
