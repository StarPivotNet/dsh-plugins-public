window.__ModuleLoader__.load({
	id: "@starpivot/dsh-kanban",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/types/client/columns.js
		/** Same-origin host route; survives device changes unlike localStorage. */
		const COLUMNS_ROUTE = "/plugins/@starpivot/dsh-kanban/columns";
		const COLUMN_IDS = [
			"inbox",
			"ready",
			"running",
			"blocked",
			"done"
		];
		/** Keep only known column ids. */
		function sanitizeColumns(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
			const next = {};
			for (const [sessionId, column] of Object.entries(value)) {
				if (sessionId === "") continue;
				if (COLUMN_IDS.includes(column)) next[sessionId] = column;
			}
			return next;
		}
		function loadLegacy() {
			try {
				return sanitizeColumns(JSON.parse(localStorage.getItem("dsh-kanban.columns.v1") ?? "{}"));
			} catch {
				return {};
			}
		}
		/**
		* Load host-owned column overrides. An empty host file adopts the old
		* localStorage map once so existing placements survive the storage move.
		*/
		async function loadColumnOverrides() {
			try {
				const response = await fetch(COLUMNS_ROUTE, { cache: "no-store" });
				if (response.ok) {
					const columns = sanitizeColumns((await response.json()).columns);
					const legacy = loadLegacy();
					if (Object.keys(columns).length === 0 && Object.keys(legacy).length > 0) {
						await saveColumnOverrides(legacy);
						return legacy;
					}
					return columns;
				}
			} catch {}
			return loadLegacy();
		}
		/** Persist the full override map on the host. */
		async function saveColumnOverrides(columns) {
			await fetch(COLUMNS_ROUTE, {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					schemaVersion: 1,
					columns
				})
			});
		}
		//#endregion
		//#region \0kanban-css:/root/CODE/dsh-plugins-public/.dsh-wt/kanban/packages/kanban/lib/types/client/Kanban.module.css.mjs
		const css = ".MRJTRG_entry{width:100%;min-width:0;height:49px;margin-top:8px;display:flex}.MRJTRG_trigger{width:100%;min-height:40px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);cursor:pointer;touch-action:manipulation;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out), transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;border-radius:12px;align-items:center;gap:8px;padding:0 8px 0 6px;display:flex}.MRJTRG_trigger:active{transform:scale(.96)}.MRJTRG_triggerActive{background:var(--dsw-specific-sidebar-nav-item-active,var(--dsw-alias-interactive-bg-active));color:var(--dsw-alias-brand-primary)}.MRJTRG_trigger:focus-visible,.MRJTRG_createHead button:focus-visible,.MRJTRG_card:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.MRJTRG_total{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;margin-left:auto}.MRJTRG_rail{width:36px;height:36px;margin:0}.MRJTRG_rail .MRJTRG_trigger{border-radius:50%;justify-content:center;width:36px;height:36px;min-height:36px;padding:0}.MRJTRG_page{background:var(--dsw-alias-bg-base);width:100%;min-height:0;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);flex:1;grid-template-rows:68px minmax(0,1fr) 34px;display:grid;overflow:hidden}.MRJTRG_header{border-bottom:1px solid var(--dsw-alias-border-l1);justify-content:space-between;align-items:center;gap:20px;min-width:0;padding:0 20px;display:flex}.MRJTRG_heading,.MRJTRG_heading>div,.MRJTRG_headerActions,.MRJTRG_cardTop,.MRJTRG_card footer,.MRJTRG_columnHeader,.MRJTRG_boardFooter,.MRJTRG_createHead,.MRJTRG_createHead>div,.MRJTRG_createActions{align-items:center;display:flex}.MRJTRG_heading{gap:11px;min-width:0}.MRJTRG_mark{background:var(--dsw-static-deepseek-500);width:34px;height:34px;color:var(--dsw-static-neutral-00);border-radius:10px;flex:none;place-items:center;display:grid}.MRJTRG_heading>div{align-items:baseline;gap:10px;min-width:0}.MRJTRG_heading h1,.MRJTRG_heading p,.MRJTRG_columnHeader h2,.MRJTRG_card h3,.MRJTRG_card p,.MRJTRG_createHead h2,.MRJTRG_error{margin:0}.MRJTRG_heading h1{white-space:nowrap;font-size:17px;font-weight:600;line-height:24px}.MRJTRG_heading p{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);white-space:nowrap}.MRJTRG_headerActions{gap:8px}.MRJTRG_search{background:var(--dsw-alias-bg-module-platform);width:180px;height:30px;color:var(--dsw-alias-label-caption);border-radius:9px;align-items:center;gap:6px;padding:0 10px;display:flex}.MRJTRG_search input{width:100%;min-width:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);background:0 0;border:0;outline:0}.MRJTRG_search input::placeholder{color:var(--dsw-alias-label-caption)}.MRJTRG_createHead button{width:32px;height:32px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:50%;place-items:center;padding:0;display:grid}.MRJTRG_board{background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-module-platform));overscroll-behavior:contain;grid-template-columns:repeat(5,minmax(210px,1fr));gap:10px;min-height:0;padding:12px;display:grid;overflow-x:auto}.MRJTRG_column{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 84%, transparent);border-radius:12px;flex-direction:column;min-width:210px;min-height:0;display:flex}.MRJTRG_columnHeader{flex:none;gap:8px;height:42px;padding:0 11px}.MRJTRG_columnHeader h2{font:var(--dsw-font-xs-strong-13)}.MRJTRG_columnCount{color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;margin-left:auto}.MRJTRG_columnAdd{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out), transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;border-radius:8px;flex:none;place-items:center;padding:0;display:grid}.MRJTRG_columnAdd:active{transform:scale(.96)}.MRJTRG_dot,.MRJTRG_syncDot{background:var(--dsw-static-neutral-bluish-400);border-radius:50%;flex:none;width:7px;height:7px;display:inline-block}.MRJTRG_column[data-column=ready] .MRJTRG_dot{background:var(--dsw-static-blue-400)}.MRJTRG_column[data-column=running] .MRJTRG_dot{background:var(--dsw-static-deepseek-500)}.MRJTRG_column[data-column=blocked] .MRJTRG_dot{background:var(--dsw-static-amber-500)}.MRJTRG_column[data-column=done] .MRJTRG_dot{background:var(--dsw-static-green-500)}.MRJTRG_cards{flex-direction:column;flex:1;gap:8px;min-height:0;padding:0 7px 8px;display:flex;overflow-y:auto}.MRJTRG_card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:100%;box-shadow:var(--dsw-shadow-lv1);color:inherit;font:inherit;text-align:left;cursor:grab;transition:box-shadow var(--ds-transition-duration-fast) var(--ds-ease-in-out), transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);border-radius:10px;flex:none;padding:11px}.MRJTRG_card:active{cursor:grabbing;transform:scale(.985)}.MRJTRG_card[data-locked=true]{cursor:default}.MRJTRG_card[data-locked=true]:active{transform:none}.MRJTRG_cardTop{justify-content:space-between;gap:6px}.MRJTRG_cardStatus{background:var(--dsw-static-deepseek-100);color:var(--dsw-static-deepseek-600);border-radius:999px;padding:2px 6px;font-size:10px;font-weight:500;line-height:16px;display:inline-flex}.MRJTRG_time{color:var(--dsw-alias-label-caption);white-space:nowrap;font-variant-numeric:tabular-nums;font-size:10px;line-height:16px}.MRJTRG_card h3{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;margin-top:8px;font-size:13px;font-weight:500;line-height:19px;overflow:hidden}.MRJTRG_card p{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;margin-top:4px;font-size:11px;line-height:16px;overflow:hidden}.MRJTRG_card footer{border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-caption);justify-content:space-between;gap:8px;margin-top:10px;padding-top:8px;font-size:10px;line-height:14px}.MRJTRG_live{color:var(--dsw-static-green-500);letter-spacing:.04em;font-weight:600}.MRJTRG_empty{border:1px dashed var(--dsw-alias-border-l2);min-height:74px;color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12);border-radius:10px;place-items:center;display:grid}.MRJTRG_boardFooter{border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);font-variant-numeric:tabular-nums;justify-content:space-between;padding:0 16px}.MRJTRG_boardFooter>span:first-child{align-items:center;gap:6px;display:flex}.MRJTRG_syncDot{background:var(--dsw-static-green-500)}.MRJTRG_createLayer{z-index:2;background:var(--dsw-alias-bg-mask-1);place-items:center;padding:20px;display:grid;position:absolute;inset:0}.MRJTRG_createCard{background:var(--dsw-alias-bg-layer-1);width:min(470px,100%);box-shadow:var(--dsw-shadow-lv3);border-radius:14px;flex-direction:column;gap:15px;padding:18px;display:flex}.MRJTRG_createHead{justify-content:space-between}.MRJTRG_createHead>div{gap:8px}.MRJTRG_createHead h2{font:var(--dsw-font-base-strong-16)}.MRJTRG_createCard label{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);flex-direction:column;gap:6px;display:flex}.MRJTRG_createCard input,.MRJTRG_createCard textarea,.MRJTRG_createCard select{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);width:100%;min-height:38px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);border-radius:9px;outline:0;padding:8px 10px}.MRJTRG_createCard textarea{resize:vertical;line-height:1.7}.MRJTRG_createCard input:focus,.MRJTRG_createCard textarea:focus,.MRJTRG_createCard select:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent)}.MRJTRG_error{color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xxs-12)}.MRJTRG_createActions{justify-content:flex-end;gap:8px}@media (hover:hover){.MRJTRG_trigger:hover,.MRJTRG_columnAdd:hover,.MRJTRG_createHead button:hover{background:var(--dsw-alias-interactive-bg-hover)}.MRJTRG_card:hover{box-shadow:var(--dsw-shadow-lv2);transform:translateY(-1px)}}@media (width<=720px){.MRJTRG_header{padding:0 12px}.MRJTRG_heading p,.MRJTRG_search{display:none}.MRJTRG_board{scroll-snap-type:x proximity;grid-template-columns:repeat(5,minmax(82vw,1fr));padding:10px}.MRJTRG_column{scroll-snap-align:start}}@media (prefers-reduced-motion:reduce){.MRJTRG_trigger,.MRJTRG_card{transition:none}}";
		const key = "@starpivot/dsh-kanban/Kanban.module.css";
		if (!document.querySelector("style[data-plugin-css=" + JSON.stringify(key) + "]")) {
			const el = document.createElement("style");
			el.dataset.plugin = "@starpivot/dsh-kanban";
			el.dataset.pluginCss = key;
			el.textContent = css;
			document.head.appendChild(el);
		}
		var Kanban_module_css_default = {
			"columnHeader": "MRJTRG_columnHeader",
			"createCard": "MRJTRG_createCard",
			"empty": "MRJTRG_empty",
			"board": "MRJTRG_board",
			"cardStatus": "MRJTRG_cardStatus",
			"triggerActive": "MRJTRG_triggerActive",
			"createHead": "MRJTRG_createHead",
			"search": "MRJTRG_search",
			"dot": "MRJTRG_dot",
			"header": "MRJTRG_header",
			"total": "MRJTRG_total",
			"createActions": "MRJTRG_createActions",
			"rail": "MRJTRG_rail",
			"mark": "MRJTRG_mark",
			"column": "MRJTRG_column",
			"cards": "MRJTRG_cards",
			"createLayer": "MRJTRG_createLayer",
			"time": "MRJTRG_time",
			"syncDot": "MRJTRG_syncDot",
			"entry": "MRJTRG_entry",
			"page": "MRJTRG_page",
			"card": "MRJTRG_card",
			"cardTop": "MRJTRG_cardTop",
			"trigger": "MRJTRG_trigger",
			"error": "MRJTRG_error",
			"heading": "MRJTRG_heading",
			"headerActions": "MRJTRG_headerActions",
			"boardFooter": "MRJTRG_boardFooter",
			"live": "MRJTRG_live",
			"columnAdd": "MRJTRG_columnAdd",
			"columnCount": "MRJTRG_columnCount"
		};
		//#endregion
		//#region lib/types/client/Kanban.js
		const columns = [
			{
				id: "inbox",
				label: "收件箱"
			},
			{
				id: "ready",
				label: "待开始"
			},
			{
				id: "running",
				label: "进行中"
			},
			{
				id: "blocked",
				label: "需处理"
			},
			{
				id: "done",
				label: "已完成"
			}
		];
		const kanbanPath = "/kanban";
		function isKanbanRoute() {
			return window.location.pathname === kanbanPath;
		}
		function automaticColumn(session) {
			if (session.pendingInteraction !== void 0) return "blocked";
			if (session.running) return "running";
			if (session.completed) return "done";
			if (session.blank) return "inbox";
			return "ready";
		}
		function relativeTime(time) {
			const seconds = Math.max(0, Math.round((Date.now() - time) / 1e3));
			if (seconds < 60) return "刚刚";
			if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
			if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
			return `${Math.floor(seconds / 86400)} 天前`;
		}
		function Kanban({ wide, useSessions, useWorkspaces, openSession, clearSession, createTask }) {
			const sessions = useSessions((state) => state);
			const workspaces = useWorkspaces((state) => state.items);
			const archivedSessionIds = useWorkspaces((state) => state.archivedSessionIds);
			const [open, setOpen] = (0, react.useState)(isKanbanRoute);
			const [pageHost, setPageHost] = (0, react.useState)(null);
			const previousSession = (0, react.useRef)(sessions.current);
			const routeSessionCleared = (0, react.useRef)(false);
			const [creating, setCreating] = (0, react.useState)(false);
			const [overrides, setOverrides] = (0, react.useState)({});
			const [query, setQuery] = (0, react.useState)("");
			const [workspaceId, setWorkspaceId] = (0, react.useState)("");
			const [title, setTitle] = (0, react.useState)("");
			const [prompt, setPrompt] = (0, react.useState)("");
			const [error, setError] = (0, react.useState)("");
			const archived = (0, react.useMemo)(() => new Set(archivedSessionIds), [archivedSessionIds]);
			const active = (0, react.useMemo)(() => sessions.ids.map((id) => sessions.byId[id]).filter((session) => session !== void 0).filter((session) => session.origin !== "subagent" && !session.blank && !archived.has(session.id)), [sessions, archived]);
			const visible = (0, react.useMemo)(() => active.filter((session) => query === "" || `${session.displayTitle} ${session.cwd ?? ""}`.toLowerCase().includes(query.toLowerCase())), [active, query]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				loadColumnOverrides().then((columns) => {
					if (!cancelled) setOverrides(columns);
				});
				return () => {
					cancelled = true;
				};
			}, []);
			(0, react.useEffect)(() => {
				const syncRoute = () => {
					const next = isKanbanRoute();
					if (next) {
						previousSession.current = sessions.current;
						routeSessionCleared.current = false;
					} else if (open && sessions.current === void 0 && previousSession.current !== void 0) openSession(previousSession.current);
					setOpen(next);
				};
				window.addEventListener("popstate", syncRoute);
				return () => window.removeEventListener("popstate", syncRoute);
			}, [
				open,
				openSession,
				sessions.current
			]);
			(0, react.useEffect)(() => {
				if (!open) {
					setPageHost(null);
					return;
				}
				const conversation = document.querySelector("[data-conversation-scroll]")?.parentElement;
				const host = conversation?.parentElement;
				if (conversation === void 0 || conversation === null || host === void 0 || host === null) return;
				const previous = conversation.style.display;
				conversation.style.display = "none";
				setPageHost(host);
				return () => {
					conversation.style.display = previous;
				};
			}, [open]);
			(0, react.useEffect)(() => {
				if (!open || sessions.phase !== "ready") return;
				if (!routeSessionCleared.current) {
					previousSession.current = sessions.current;
					clearSession();
					routeSessionCleared.current = true;
					return;
				}
				if (sessions.current !== void 0) {
					window.history.replaceState(window.history.state, "", "/");
					setOpen(false);
				}
			}, [
				clearSession,
				open,
				sessions.current,
				sessions.phase
			]);
			const showBoard = () => {
				if (open) return;
				previousSession.current = sessions.current;
				routeSessionCleared.current = true;
				window.history.pushState({
					...window.history.state,
					kanban: true
				}, "", kanbanPath);
				clearSession();
				setOpen(true);
			};
			const showSession = (sessionId) => {
				window.history.replaceState(window.history.state, "", "/");
				setOpen(false);
				openSession(sessionId);
			};
			const move = (sessionId, column) => {
				const session = sessions.byId[sessionId];
				if (session === void 0 || session.running || session.pendingInteraction !== void 0) return;
				const next = {
					...overrides,
					[sessionId]: column
				};
				setOverrides(next);
				saveColumnOverrides(next);
			};
			const submit = async (event) => {
				event.preventDefault();
				if (workspaceId === "" || title.trim() === "" || prompt.trim() === "") return;
				setError("");
				try {
					await createTask(workspaceId, title.trim(), prompt.trim());
					setCreating(false);
					setTitle("");
					setPrompt("");
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: `${Kanban_module_css_default.entry} ${wide ? "" : Kanban_module_css_default.rail}`,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: `${Kanban_module_css_default.trigger} ${open ? Kanban_module_css_default.triggerActive : ""}`,
					"aria-label": "打开任务看板",
					"aria-current": open ? "page" : void 0,
					onClick: showBoard,
					children: [
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, { size: 16 }),
						wide && (0, react_jsx_runtime.jsx)("span", { children: "任务看板" }),
						wide && (0, react_jsx_runtime.jsx)("span", {
							className: Kanban_module_css_default.total,
							children: active.length
						})
					]
				}), open && pageHost !== null && (0, react_dom.createPortal)((0, react_jsx_runtime.jsxs)("main", {
					className: Kanban_module_css_default.page,
					lang: "zh-CN",
					"aria-label": "任务看板",
					children: [
						(0, react_jsx_runtime.jsxs)("header", {
							className: Kanban_module_css_default.header,
							children: [(0, react_jsx_runtime.jsxs)("div", {
								className: Kanban_module_css_default.heading,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: Kanban_module_css_default.mark,
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, { size: 18 })
								}), (0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("h1", { children: "任务看板" }), (0, react_jsx_runtime.jsx)("p", { children: "DeepSeek Harness 会话工作流" })] })]
							}), (0, react_jsx_runtime.jsxs)("div", {
								className: Kanban_module_css_default.headerActions,
								children: [(0, react_jsx_runtime.jsxs)("label", {
									className: Kanban_module_css_default.search,
									children: [(0, react_jsx_runtime.jsx)("span", { children: "⌕" }), (0, react_jsx_runtime.jsx)("input", {
										value: query,
										onChange: (event) => setQuery(event.target.value),
										placeholder: "搜索任务",
										"aria-label": "搜索任务"
									})]
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									size: "sm",
									icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }),
									onClick: () => setCreating(true),
									children: "新建任务"
								})]
							})]
						}),
						(0, react_jsx_runtime.jsx)("div", {
							className: Kanban_module_css_default.board,
							children: columns.map((column) => {
								const items = visible.filter((session) => {
									const automatic = automaticColumn(session);
									return (session.running || session.pendingInteraction !== void 0 || session.completed ? automatic : overrides[session.id] ?? automatic) === column.id;
								});
								return (0, react_jsx_runtime.jsxs)("section", {
									className: Kanban_module_css_default.column,
									"data-column": column.id,
									onDragOver: (event) => event.preventDefault(),
									onDrop: (event) => {
										event.preventDefault();
										move(event.dataTransfer.getData("text/plain"), column.id);
									},
									children: [(0, react_jsx_runtime.jsxs)("header", {
										className: Kanban_module_css_default.columnHeader,
										children: [
											(0, react_jsx_runtime.jsx)("span", { className: Kanban_module_css_default.dot }),
											(0, react_jsx_runtime.jsx)("h2", { children: column.label }),
											(0, react_jsx_runtime.jsx)("span", {
												className: Kanban_module_css_default.columnCount,
												children: items.length
											}),
											column.id !== "done" && (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: Kanban_module_css_default.columnAdd,
												"aria-label": `在${column.label}中新建任务`,
												onClick: () => setCreating(true),
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 })
											})
										]
									}), (0, react_jsx_runtime.jsxs)("div", {
										className: Kanban_module_css_default.cards,
										children: [items.map((session) => (0, react_jsx_runtime.jsxs)("article", {
											role: "button",
											tabIndex: 0,
											className: Kanban_module_css_default.card,
											draggable: !session.running && session.pendingInteraction === void 0,
											"aria-disabled": session.running || session.pendingInteraction !== void 0,
											"data-locked": session.running || session.pendingInteraction !== void 0 || void 0,
											onDragStart: (event) => event.dataTransfer.setData("text/plain", session.id),
											onClick: () => showSession(session.id),
											onKeyDown: (event) => {
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													showSession(session.id);
												}
											},
											children: [
												(0, react_jsx_runtime.jsxs)("div", {
													className: Kanban_module_css_default.cardTop,
													children: [(0, react_jsx_runtime.jsx)("span", {
														className: Kanban_module_css_default.cardStatus,
														children: session.running ? "执行中" : session.pendingInteraction !== void 0 ? "等待输入" : session.completed ? "已完成" : "会话"
													}), (0, react_jsx_runtime.jsx)("span", {
														className: Kanban_module_css_default.time,
														children: relativeTime(session.updatedAt)
													})]
												}),
												(0, react_jsx_runtime.jsx)("h3", { children: session.blank ? "新任务" : session.displayTitle }),
												(0, react_jsx_runtime.jsx)("p", { children: session.cwd ?? "未关联工作区" }),
												(0, react_jsx_runtime.jsxs)("footer", { children: [(0, react_jsx_runtime.jsx)("span", { children: session.agentPreset ?? "default" }), session.running && (0, react_jsx_runtime.jsx)("span", {
													className: Kanban_module_css_default.live,
													children: "● LIVE"
												})] })
											]
										}, session.id)), items.length === 0 && (0, react_jsx_runtime.jsx)("div", {
											className: Kanban_module_css_default.empty,
											children: "拖动任务到这里"
										})]
									})]
								}, column.id);
							})
						}),
						(0, react_jsx_runtime.jsxs)("footer", {
							className: Kanban_module_css_default.boardFooter,
							children: [(0, react_jsx_runtime.jsxs)("span", { children: [(0, react_jsx_runtime.jsx)("i", { className: Kanban_module_css_default.syncDot }), " 已连接 Harness"] }), (0, react_jsx_runtime.jsxs)("span", { children: [visible.length, " 个任务"] })]
						}),
						creating && (0, react_jsx_runtime.jsx)("div", {
							className: Kanban_module_css_default.createLayer,
							children: (0, react_jsx_runtime.jsxs)("form", {
								className: Kanban_module_css_default.createCard,
								onSubmit: submit,
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										className: Kanban_module_css_default.createHead,
										children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, { size: 18 }), (0, react_jsx_runtime.jsx)("h2", { children: "新建任务" })] }), (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											"aria-label": "关闭新建任务",
											onClick: () => setCreating(false),
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 16 })
										})]
									}),
									(0, react_jsx_runtime.jsxs)("label", { children: ["工作区", (0, react_jsx_runtime.jsxs)("select", {
										value: workspaceId,
										onChange: (event) => setWorkspaceId(event.target.value),
										required: true,
										children: [(0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: "选择工作区"
										}), workspaces.map((workspace) => (0, react_jsx_runtime.jsx)("option", {
											value: workspace.workspaceId,
											children: workspace.title
										}, workspace.workspaceId))]
									})] }),
									(0, react_jsx_runtime.jsxs)("label", { children: ["任务标题", (0, react_jsx_runtime.jsx)("input", {
										value: title,
										onChange: (event) => setTitle(event.target.value),
										placeholder: "例如：修复登录回归",
										required: true
									})] }),
									(0, react_jsx_runtime.jsxs)("label", { children: ["交给 DeepSeek 的任务", (0, react_jsx_runtime.jsx)("textarea", {
										value: prompt,
										onChange: (event) => setPrompt(event.target.value),
										placeholder: "描述目标、约束和验收条件",
										rows: 6,
										required: true
									})] }),
									error !== "" && (0, react_jsx_runtime.jsx)("p", {
										className: Kanban_module_css_default.error,
										children: error
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: Kanban_module_css_default.createActions,
										children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											size: "sm",
											onClick: () => setCreating(false),
											children: "取消"
										}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											type: "submit",
											variant: "primary",
											size: "sm",
											disabled: workspaceId === "" || title.trim() === "" || prompt.trim() === "",
											children: "创建并运行"
										})]
									})
								]
							})
						})
					]
				}), pageHost)]
			});
		}
		//#endregion
		//#region lib/types/client/index.js
		const inject = [
			"slots",
			"sessions",
			"workspaces"
		];
		function apply(ctx) {
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "kanban",
				order: 80,
				inject: () => ({
					openSession: (sessionId) => {
						ctx.sessions.open(sessionId);
					},
					clearSession: () => {
						ctx.sessions.clear();
					},
					createTask: async (workspaceId, title, prompt) => {
						const sessionId = await ctx.workspaces.connectWorkspace(workspaceId);
						const binding = ctx.sessions.binding(sessionId);
						if (binding === void 0) throw new Error("新会话尚未就绪");
						const renamed = await binding.session.rename(title);
						if (!renamed.ok) throw new Error(renamed.error.message);
						const sent = await binding.session.prompt([{
							type: "text",
							text: prompt
						}], "queue");
						if (!sent.ok) throw new Error(sent.error.message);
						ctx.sessions.open(sessionId);
						return sessionId;
					}
				})
			}, Kanban));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map