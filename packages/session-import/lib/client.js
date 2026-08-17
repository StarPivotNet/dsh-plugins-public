window.__ModuleLoader__.load({ id: "@starpivot/dsh-session-import", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  NS: () => NS,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/SessionImportSection.tsx
var import_react = require("react");

// src/client/SessionImportSection.module.css
var css = '.YmEt6W_section{width:100%;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}.YmEt6W_heading{margin:0;font-size:18px;font-weight:600}.YmEt6W_intro,.YmEt6W_hint,.YmEt6W_empty,.YmEt6W_status{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.YmEt6W_failure{color:var(--dsw-alias-state-error-primary);margin:0;font-size:13px;line-height:20px}.YmEt6W_tabs{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:flex-end;gap:22px;display:flex}.YmEt6W_tab{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;padding:7px 1px 9px;font-size:13px;line-height:20px;position:relative}.YmEt6W_tab[data-active=true]{color:var(--dsw-alias-label-primary)}.YmEt6W_tab[data-active=true]:after{content:"";background:var(--dsw-alias-label-primary);height:2px;position:absolute;bottom:-1px;left:0;right:0}.YmEt6W_toolbar{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.YmEt6W_select,.YmEt6W_search{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;border-radius:8px;padding:6px 10px;font-size:13px}.YmEt6W_search{flex:180px;min-width:160px}.YmEt6W_button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;cursor:pointer;border-radius:8px;padding:6px 12px;font-size:13px}.YmEt6W_button[data-primary=true]{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);border-color:#0000}.YmEt6W_button:disabled{opacity:.5;cursor:default}.YmEt6W_list{flex-direction:column;gap:8px;display:flex}.YmEt6W_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:10px;grid-template-columns:20px minmax(0,1fr) auto;align-items:start;gap:10px;padding:10px 12px;display:grid}.YmEt6W_title{margin:0;font-size:13px;font-weight:600;line-height:20px}.YmEt6W_meta{color:var(--dsw-alias-label-tertiary);word-break:break-all;margin:2px 0 0;font-size:12px;line-height:18px}.YmEt6W_tag{background:var(--dsw-alias-bg-layer-2,transparent);border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;line-height:16px;display:inline-flex}';
var tagId = "session-import/SessionImportSection.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "@starpivot/dsh-session-import";
  tag.dataset.pluginCss = tagId;
  tag.textContent = css;
  document.head.appendChild(tag);
}
var SessionImportSection_default = { "tab": "YmEt6W_tab", "toolbar": "YmEt6W_toolbar", "title": "YmEt6W_title", "status": "YmEt6W_status", "tabs": "YmEt6W_tabs", "row": "YmEt6W_row", "meta": "YmEt6W_meta", "section": "YmEt6W_section", "tag": "YmEt6W_tag", "heading": "YmEt6W_heading", "button": "YmEt6W_button", "failure": "YmEt6W_failure", "empty": "YmEt6W_empty", "intro": "YmEt6W_intro", "list": "YmEt6W_list", "select": "YmEt6W_select", "hint": "YmEt6W_hint", "search": "YmEt6W_search" };

// src/client/SessionImportSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function SessionImportSection(props) {
  const { t, listSessions, importSessions, listSkills, importSkills } = props;
  const [tab, setTab] = (0, import_react.useState)("sessions");
  const [source, setSource] = (0, import_react.useState)("all");
  const [query, setQuery] = (0, import_react.useState)("");
  const [rows, setRows] = (0, import_react.useState)([]);
  const [skills, setSkills] = (0, import_react.useState)([]);
  const [selected, setSelected] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const [status, setStatus] = (0, import_react.useState)("idle");
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [message, setMessage] = (0, import_react.useState)("");
  const [failure, setFailure] = (0, import_react.useState)("");
  const load = async () => {
    setStatus("loading");
    setFailure("");
    try {
      if (tab === "sessions") {
        const snapshot = await listSessions(source === "all" ? void 0 : source);
        setRows(snapshot.entries);
      } else {
        const snapshot = await listSkills();
        setSkills(snapshot.entries);
      }
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };
  (0, import_react.useEffect)(() => {
    void load();
  }, [tab, source]);
  const visibleRows = (0, import_react.useMemo)(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return rows;
    return rows.filter((row) => row.title.toLowerCase().includes(needle) || row.path.toLowerCase().includes(needle) || row.nativeId.toLowerCase().includes(needle));
  }, [rows, query]);
  const visibleSkills = (0, import_react.useMemo)(() => {
    const filtered = source === "all" ? skills : skills.filter((skill) => skill.source === source);
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return filtered;
    return filtered.filter((skill) => skill.name.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle) || skill.path.toLowerCase().includes(needle));
  }, [skills, source, query]);
  const toggle = (path) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };
  const runImport = async (paths) => {
    setBusy(true);
    setMessage("");
    setFailure("");
    try {
      if (tab === "sessions") {
        const result = await importSessions(paths);
        setMessage(`${t("imported")} ${String(result.imported)} / ${String(result.skipped)}`);
        if (result.failed.length > 0) setFailure(`${t("failed")} ${String(result.failed.length)}`);
      } else {
        const result = await importSkills(paths);
        setMessage(`${t("importedSkills")} ${String(result.copied)}`);
        if (result.failed.length > 0) setFailure(`${t("failed")} ${String(result.failed.length)}`);
      }
    } catch {
      setFailure(t("error"));
    } finally {
      setBusy(false);
    }
  };
  const currentPaths = tab === "sessions" ? visibleRows.map((row) => row.path) : visibleSkills.map((skill) => skill.path);
  const selectedPaths = currentPaths.filter((path) => selected.has(path));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: SessionImportSection_default.section, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: SessionImportSection_default.heading, children: t("title") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.intro, children: t("intro") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: SessionImportSection_default.tabs, role: "tablist", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: SessionImportSection_default.tab, "data-active": tab === "sessions", onClick: () => {
        setTab("sessions");
        setSelected(/* @__PURE__ */ new Set());
      }, children: t("sessionsTab") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: SessionImportSection_default.tab, "data-active": tab === "skills", onClick: () => {
        setTab("skills");
        setSelected(/* @__PURE__ */ new Set());
      }, children: t("skillsTab") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: SessionImportSection_default.toolbar, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: SessionImportSection_default.hint, children: t("sourceFilter") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: SessionImportSection_default.select, value: source, onChange: (event) => {
          setSource(event.target.value);
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "all", children: t("sourceAll") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "claude", children: t("sourceClaude") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "codex", children: t("sourceCodex") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "cursor", children: t("sourceCursor") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: SessionImportSection_default.search, value: query, onChange: (event) => {
        setQuery(event.target.value);
      }, placeholder: t("search") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: SessionImportSection_default.button, disabled: status === "loading", onClick: () => {
        void load();
      }, children: status === "loading" ? t("refreshing") : t("refresh") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: SessionImportSection_default.button, disabled: busy || selectedPaths.length === 0, onClick: () => {
        void runImport(selectedPaths);
      }, children: busy ? t("importing") : t("importSelected") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: SessionImportSection_default.button, "data-primary": "true", disabled: busy || currentPaths.length === 0, onClick: () => {
        void runImport(currentPaths);
      }, children: t("importAll") })
    ] }),
    message.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.status, children: message }) : null,
    failure.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.failure, role: "alert", children: failure }) : null,
    status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.failure, role: "alert", children: t("error") }) : tab === "sessions" ? visibleRows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.empty, children: t("empty") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: SessionImportSection_default.list, children: visibleRows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: SessionImportSection_default.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: selected.has(row.path), onChange: () => {
        toggle(row.path);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.title, children: row.title }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: SessionImportSection_default.meta, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: SessionImportSection_default.tag, children: row.source }),
          " ",
          t("nativeId"),
          ": ",
          row.nativeId
        ] }),
        row.cwd === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: SessionImportSection_default.meta, children: [
          t("cwd"),
          ": ",
          row.cwd
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.meta, children: row.path })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: SessionImportSection_default.meta, children: formatBytes(row.bytes) })
    ] }, row.path)) }) : visibleSkills.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.empty, children: t("skillsEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: SessionImportSection_default.list, children: visibleSkills.map((skill) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: SessionImportSection_default.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: selected.has(skill.path), onChange: () => {
        toggle(skill.path);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.title, children: skill.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: SessionImportSection_default.meta, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: SessionImportSection_default.tag, children: skill.source }),
          " ",
          skill.description
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.meta, children: skill.path })
      ] })
    ] }, skill.path)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.hint, children: t("commandHint") })
  ] });
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// src/client/locales.ts
var zh = {
  nav: "\u5BFC\u5165",
  title: "\u5BFC\u5165\u5176\u4ED6 AI \u4F1A\u8BDD",
  intro: "\u626B\u63CF\u672C\u673A Cursor\u3001Codex \u548C Claude Code \u7684\u4F1A\u8BDD\u4E0E\u6280\u80FD\uFF0C\u8F6C\u6210 DeepSeek Harness \u4F1A\u8BDD\u3002\u5BFC\u5165\u540E\u5237\u65B0\u4F1A\u8BDD\u5217\u8868\u5373\u53EF\u6253\u5F00\u3002",
  sessionsTab: "\u4F1A\u8BDD",
  skillsTab: "\u6280\u80FD",
  refresh: "\u91CD\u65B0\u626B\u63CF",
  refreshing: "\u626B\u63CF\u4E2D\u2026",
  importSelected: "\u5BFC\u5165\u9009\u4E2D",
  importAll: "\u5168\u90E8\u5BFC\u5165",
  importing: "\u5BFC\u5165\u4E2D\u2026",
  empty: "\u6CA1\u6709\u53D1\u73B0\u53EF\u5BFC\u5165\u7684\u4F1A\u8BDD\u3002",
  skillsEmpty: "\u6CA1\u6709\u53D1\u73B0\u53EF\u5BFC\u5165\u7684\u6280\u80FD\u3002",
  sourceFilter: "\u6765\u6E90",
  sourceAll: "\u5168\u90E8",
  sourceClaude: "Claude Code",
  sourceCodex: "Codex",
  sourceCursor: "Cursor",
  search: "\u6309\u6807\u9898\u6216\u8DEF\u5F84\u7B5B\u9009",
  imported: "\u5BFC\u5165\u5B8C\u6210\u3002",
  importedSkills: "\u6280\u80FD\u5DF2\u590D\u5236\u5230 ~/.dsh/skills\u3002",
  failed: "\u90E8\u5206\u9879\u76EE\u5BFC\u5165\u5931\u8D25\u3002",
  error: "\u6682\u65F6\u65E0\u6CD5\u626B\u63CF\u672C\u673A\u4F1A\u8BDD\u3002",
  retry: "\u91CD\u8BD5",
  cwd: "\u5DE5\u4F5C\u76EE\u5F55",
  nativeId: "\u539F\u59CB id",
  bytes: "\u5927\u5C0F",
  commandHint: "\u4E5F\u53EF\u4EE5\u5728\u5BF9\u8BDD\u91CC\u7528 /import list\u3001/import all\u3001/import skills\u3002"
};
var en = {
  nav: "Import",
  title: "Import other AI sessions",
  intro: "Scan local Cursor, Codex, and Claude Code conversations and skills, then write them as DeepSeek Harness sessions. Refresh the session list after import.",
  sessionsTab: "Sessions",
  skillsTab: "Skills",
  refresh: "Rescan",
  refreshing: "Scanning\u2026",
  importSelected: "Import selected",
  importAll: "Import all",
  importing: "Importing\u2026",
  empty: "No foreign sessions found.",
  skillsEmpty: "No foreign skills found.",
  sourceFilter: "Source",
  sourceAll: "All",
  sourceClaude: "Claude Code",
  sourceCodex: "Codex",
  sourceCursor: "Cursor",
  search: "Filter by title or path",
  imported: "Import finished.",
  importedSkills: "Skills copied into ~/.dsh/skills.",
  failed: "Some items failed to import.",
  error: "Could not scan local sessions.",
  retry: "Retry",
  cwd: "Working directory",
  nativeId: "Native id",
  bytes: "Size",
  commandHint: "You can also run /import list, /import all, or /import skills in chat."
};

// src/client/index.ts
var NS = "settings.sessionImport";
var inject = ["slots", "locale", "connection"];
function sessionImportCaller(ctx) {
  const rpc = ctx.get("connection").rpc;
  return async (method, body) => {
    const payload = await rpc.call("/session-import", method, body ?? {});
    if (!payload.ok) {
      throw new Error("sessionImport." + method + " failed: " + payload.error.message);
    }
    return payload.value;
  };
}
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "session-import: dictionaries");
  const call = sessionImportCaller(ctx);
  const injected = () => ({
    listSessions: (source) => call("listSessions", source === void 0 ? {} : { source }),
    importSessions: (paths) => call("importSessions", { paths }),
    listSkills: () => call("listSkills"),
    importSkills: (paths) => call("importSkills", { paths })
  });
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "session-import",
    order: 16,
    label: () => ctx.locale.bind(NS)("nav"),
    locale: NS,
    inject: injected
  }, SessionImportSection));
}

return module.exports; } });
