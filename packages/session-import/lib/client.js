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
var css = '.YmEt6W_section{width:100%;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}.YmEt6W_heading{margin:0;font-size:18px;font-weight:600}.YmEt6W_intro,.YmEt6W_hint,.YmEt6W_empty,.YmEt6W_status{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.YmEt6W_failure{color:var(--dsw-alias-state-error-primary);margin:0;font-size:13px;line-height:20px}.YmEt6W_tabs{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:flex-end;gap:22px;display:flex}.YmEt6W_tab{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;padding:7px 1px 9px;font-size:13px;line-height:20px;position:relative}.YmEt6W_tab[data-active=true]{color:var(--dsw-alias-label-primary)}.YmEt6W_tab[data-active=true]:after{content:"";background:var(--dsw-alias-label-primary);height:2px;position:absolute;bottom:-1px;left:0;right:0}.YmEt6W_toolbar{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.YmEt6W_select,.YmEt6W_search{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;border-radius:8px;padding:6px 10px;font-size:13px}.YmEt6W_search{flex:180px;min-width:160px}.YmEt6W_button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;cursor:pointer;border-radius:8px;padding:6px 12px;font-size:13px}.YmEt6W_button[data-primary=true]{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);border-color:#0000}.YmEt6W_button:disabled{opacity:.5;cursor:default}.YmEt6W_list{flex-direction:column;gap:8px;display:flex}.YmEt6W_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:10px;grid-template-columns:20px minmax(0,1fr) auto;align-items:start;gap:10px;padding:10px 12px;display:grid}.YmEt6W_title{margin:0;font-size:13px;font-weight:600;line-height:20px}.YmEt6W_meta{color:var(--dsw-alias-label-tertiary);word-break:break-all;margin:2px 0 0;font-size:12px;line-height:18px}.YmEt6W_tag{background:var(--dsw-alias-bg-layer-2,transparent);border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;line-height:16px;display:inline-flex}.YmEt6W_progress{background:var(--dsw-alias-bg-layer-2);border-radius:999px;height:6px;overflow:hidden}.YmEt6W_progressBar{background:var(--dsw-alias-label-primary);height:100%;transition:width .12s linear}';
var tagId = "session-import/SessionImportSection.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "@starpivot/dsh-session-import";
  tag.dataset.pluginCss = tagId;
  tag.textContent = css;
  document.head.appendChild(tag);
}
var SessionImportSection_default = { "section": "YmEt6W_section", "tabs": "YmEt6W_tabs", "status": "YmEt6W_status", "failure": "YmEt6W_failure", "list": "YmEt6W_list", "progress": "YmEt6W_progress", "toolbar": "YmEt6W_toolbar", "title": "YmEt6W_title", "button": "YmEt6W_button", "tag": "YmEt6W_tag", "progressBar": "YmEt6W_progressBar", "intro": "YmEt6W_intro", "select": "YmEt6W_select", "search": "YmEt6W_search", "tab": "YmEt6W_tab", "hint": "YmEt6W_hint", "row": "YmEt6W_row", "meta": "YmEt6W_meta", "heading": "YmEt6W_heading", "empty": "YmEt6W_empty" };

// src/client/SessionImportSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var SESSION_SOURCES = ["claude", "codex", "cursor", "grok"];
function SessionImportSection(props) {
  const { t, listSessions, importSessions, importOneSession, listSkills, importSkills, listMemories, importMemories, listAutomations, importAutomations } = props;
  const [tab, setTab] = (0, import_react.useState)("sessions");
  const [source, setSource] = (0, import_react.useState)("all");
  const [query, setQuery] = (0, import_react.useState)("");
  const [rows, setRows] = (0, import_react.useState)([]);
  const [total, setTotal] = (0, import_react.useState)(0);
  const [skills, setSkills] = (0, import_react.useState)([]);
  const [memories, setMemories] = (0, import_react.useState)([]);
  const [automations, setAutomations] = (0, import_react.useState)([]);
  const [selected, setSelected] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const [status, setStatus] = (0, import_react.useState)("loading");
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [progress, setProgress] = (0, import_react.useState)(void 0);
  const [message, setMessage] = (0, import_react.useState)("");
  const [failure, setFailure] = (0, import_react.useState)("");
  const load = async (nextQuery = query) => {
    setStatus("loading");
    setFailure("");
    try {
      if (tab === "sessions") {
        const sources = source === "all" ? SESSION_SOURCES : [source];
        const collected = [];
        let discovered = 0;
        setRows([]);
        setTotal(0);
        for (const nextSource of sources) {
          const snapshot = await listSessions(nextSource, nextQuery.trim() || void 0);
          collected.push(...snapshot.entries);
          discovered += snapshot.total ?? snapshot.entries.length;
          collected.sort((left, right) => right.updatedAt - left.updatedAt || left.path.localeCompare(right.path));
          setRows([...collected]);
          setTotal(discovered);
        }
      } else if (tab === "skills") {
        const snapshot = await listSkills();
        setSkills(snapshot.entries);
        setTotal(snapshot.entries.length);
      } else if (tab === "memory") {
        const snapshot = await listMemories();
        setMemories(snapshot.entries);
        setTotal(snapshot.entries.length);
      } else {
        const snapshot = await listAutomations();
        setAutomations(snapshot.entries);
        setTotal(snapshot.entries.length);
      }
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };
  (0, import_react.useEffect)(() => {
    void load();
  }, [tab, source]);
  const visibleRows = (0, import_react.useMemo)(() => filterByQuery(rows, query, (row) => [row.title, row.path, row.nativeId]), [rows, query]);
  const visibleSkills = (0, import_react.useMemo)(() => {
    const filtered = source === "all" ? skills : skills.filter((skill) => skill.source === source);
    return filterByQuery(filtered, query, (skill) => [skill.name, skill.description, skill.path]);
  }, [skills, source, query]);
  const visibleMemories = (0, import_react.useMemo)(() => filterByQuery(memories, query, (row) => [row.name, row.preview, row.path]), [memories, query]);
  const visibleAutomations = (0, import_react.useMemo)(() => filterByQuery(automations, query, (row) => [row.name, row.nativeId, row.path, row.prompt]), [automations, query]);
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
    setProgress(void 0);
    try {
      if (tab === "sessions") {
        const result = await importSessionPaths(importOneSession, paths, (done, total2, current) => {
          setProgress({ done, total: total2, current });
          setMessage(t("importProgress").replace("{done}", String(done)).replace("{total}", String(total2)));
        });
        setMessage(`${t("imported")} ${String(result.imported)} / ${String(result.skipped)}`);
        setImportFailure(t, result.failed, setFailure);
      } else if (tab === "skills") {
        const result = await importSkills(paths);
        setMessage(`${t("importedSkills")} ${String(result.copied)}`);
        setImportFailure(t, result.failed, setFailure);
      } else if (tab === "memory") {
        const result = await importMemories(paths);
        setMessage(`${t("importedMemory")} ${String(result.copied)} / ${String(result.merged)}`);
        setImportFailure(t, result.failed, setFailure);
      } else {
        const result = await importAutomations(paths);
        setMessage(`${t("importedAutomations")} ${String(result.imported)} / ${String(result.skipped)} / ${String(result.unsupported)}`);
        setImportFailure(t, result.failed, setFailure);
      }
    } catch {
      setFailure(t("error"));
    } finally {
      setBusy(false);
      setProgress(void 0);
    }
  };
  const currentPaths = tab === "sessions" ? visibleRows.map((row) => row.path) : tab === "skills" ? visibleSkills.map((skill) => skill.path) : tab === "memory" ? visibleMemories.map((row) => row.path) : visibleAutomations.map((row) => row.path);
  const selectedPaths = currentPaths.filter((path) => selected.has(path));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: SessionImportSection_default.section, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: SessionImportSection_default.heading, children: t("title") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.intro, children: t("intro") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: SessionImportSection_default.tabs, role: "tablist", children: ["sessions", "skills", "memory", "automations"].map((next) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: SessionImportSection_default.tab, "data-active": tab === next, onClick: () => {
      setTab(next);
      setSelected(/* @__PURE__ */ new Set());
    }, children: t(`${next}Tab`) }, next)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: SessionImportSection_default.toolbar, children: [
      tab === "sessions" || tab === "skills" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: SessionImportSection_default.hint, children: t("sourceFilter") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: SessionImportSection_default.select, value: source, onChange: (event) => {
          setSource(event.target.value);
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "all", children: t("sourceAll") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "claude", children: t("sourceClaude") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "codex", children: t("sourceCodex") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "cursor", children: t("sourceCursor") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "grok", children: t("sourceGrok") })
        ] })
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          className: SessionImportSection_default.search,
          value: query,
          onChange: (event) => {
            setQuery(event.target.value);
          },
          onKeyDown: (event) => {
            if (event.key === "Enter") void load();
          },
          placeholder: t("search")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: SessionImportSection_default.button, disabled: status === "loading", onClick: () => {
        void load();
      }, children: status === "loading" ? t("refreshing") : t("refresh") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: SessionImportSection_default.button, disabled: busy || selectedPaths.length === 0, onClick: () => {
        void runImport(selectedPaths);
      }, children: busy && tab === "sessions" && progress !== void 0 ? `${t("importing")} ${String(progress.done)}/${String(progress.total)}` : busy ? t("importing") : t("importSelected") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: SessionImportSection_default.button, "data-primary": "true", disabled: busy || currentPaths.length === 0, onClick: () => {
        void runImport(currentPaths);
      }, children: t("importAll") })
    ] }),
    message.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.status, children: message }) : null,
    progress !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: SessionImportSection_default.progress, role: "progressbar", "aria-valuemin": 0, "aria-valuemax": progress.total, "aria-valuenow": progress.done, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: SessionImportSection_default.progressBar, style: { width: `${progress.total === 0 ? 0 : Math.round(progress.done / progress.total * 100)}%` } }) }) : null,
    progress?.current !== void 0 && progress.current.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.hint, children: progress.current }) : null,
    failure.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.failure, role: "alert", children: failure }) : null,
    renderBody({
      t,
      tab,
      status,
      visibleRows,
      visibleSkills,
      visibleMemories,
      visibleAutomations,
      selected,
      toggle
    }),
    status === "idle" && tab === "sessions" && total > visibleRows.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.hint, children: t("truncated").replace("{shown}", String(visibleRows.length)).replace("{total}", String(total)) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.hint, children: t("commandHint") })
  ] });
}
function renderBody(options) {
  const { t, tab, status, visibleRows, visibleSkills, visibleMemories, visibleAutomations, selected, toggle } = options;
  if (status === "error") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.failure, role: "alert", children: t("error") });
  if (tab === "sessions") {
    if (visibleRows.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.empty, children: status === "loading" ? t("refreshing") : t("empty") });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: SessionImportSection_default.list, children: visibleRows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: SessionImportSection_default.row, children: [
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
    ] }, row.path)) });
  }
  if (tab === "skills") {
    if (visibleSkills.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.empty, children: status === "loading" ? t("refreshing") : t("skillsEmpty") });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: SessionImportSection_default.list, children: visibleSkills.map((skill) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: SessionImportSection_default.row, children: [
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
    ] }, skill.path)) });
  }
  if (tab === "memory") {
    if (visibleMemories.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.empty, children: status === "loading" ? t("refreshing") : t("memoryEmpty") });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: SessionImportSection_default.list, children: visibleMemories.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: SessionImportSection_default.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: selected.has(row.path), onChange: () => {
        toggle(row.path);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.title, children: row.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: SessionImportSection_default.meta, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: SessionImportSection_default.tag, children: row.source }),
          " ",
          row.kind
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.meta, children: row.preview }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.meta, children: row.path })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: SessionImportSection_default.meta, children: formatBytes(row.bytes) })
    ] }, row.path)) });
  }
  if (visibleAutomations.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.empty, children: status === "loading" ? t("refreshing") : t("automationsEmpty") });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: SessionImportSection_default.list, children: visibleAutomations.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: SessionImportSection_default.row, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: selected.has(row.path), onChange: () => {
      toggle(row.path);
    } }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.title, children: row.name }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: SessionImportSection_default.meta, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: SessionImportSection_default.tag, children: row.status }),
        " ",
        scheduleLabel(row)
      ] }),
      row.cwd === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: SessionImportSection_default.meta, children: [
        t("cwd"),
        ": ",
        row.cwd
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: SessionImportSection_default.meta, children: row.path })
    ] })
  ] }, row.path)) });
}
function scheduleLabel(row) {
  if (row.schedule.kind === "every") return `every ${String(row.schedule.everySeconds)}s`;
  if (row.schedule.kind === "local-clock") return row.schedule.time ?? row.rrule ?? "local-clock";
  return row.schedule.reason ?? row.rrule ?? "unsupported";
}
function filterByQuery(items, query, values) {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return items;
  return items.filter((item) => values(item).some((value) => value.toLowerCase().includes(needle)));
}
async function importSessionPaths(importOneSession, paths, onProgress) {
  let imported = 0;
  let skipped = 0;
  const failed = [];
  const total = paths.length;
  for (const [index, path] of paths.entries()) {
    onProgress(index, total, path);
    try {
      const result = await withTimeout(importOneSession(path), 6e4, path);
      imported += result.imported;
      skipped += result.skipped;
      failed.push(...result.failed);
    } catch (error) {
      failed.push({ path, message: error instanceof Error ? error.message : String(error) });
    }
  }
  onProgress(total, total, "");
  return { imported, skipped, failed };
}
async function withTimeout(work, ms, path) {
  let timer;
  try {
    return await Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${path} timed out after ${String(ms)}ms`));
        }, ms);
      })
    ]);
  } finally {
    if (timer !== void 0) clearTimeout(timer);
  }
}
function setImportFailure(t, failed, setFailure) {
  if (failed.length === 0) return;
  setFailure(`${t("failed")} ${String(failed.length)}\uFF1A${failed.slice(0, 3).map((item) => item.message).join("\uFF1B")}`);
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
  intro: "\u626B\u63CF\u672C\u673A Cursor\u3001Codex\u3001Claude Code \u548C Grok Build \u7684\u4F1A\u8BDD\u3001\u6280\u80FD\u3001\u9879\u76EE\u8BB0\u5FC6\u548C\u81EA\u52A8\u5316\u3002\u5BFC\u5165\u9ED8\u8BA4\u7559\u5728\u539F\u6765\u7684\u9879\u76EE\u76EE\u5F55\uFF0C\u6CA1\u6709\u5BF9\u5E94\u5DE5\u4F5C\u533A\u5C31\u81EA\u52A8\u65B0\u5EFA\u3002",
  sessionsTab: "\u4F1A\u8BDD",
  skillsTab: "\u6280\u80FD",
  memoryTab: "\u8BB0\u5FC6",
  automationsTab: "\u81EA\u52A8\u5316",
  refresh: "\u91CD\u65B0\u626B\u63CF",
  refreshing: "\u626B\u63CF\u4E2D\u2026",
  importSelected: "\u5BFC\u5165\u9009\u4E2D",
  importAll: "\u5168\u90E8\u5BFC\u5165",
  importing: "\u5BFC\u5165\u4E2D\u2026",
  importProgress: "\u6B63\u5728\u5BFC\u5165 {done}/{total}",
  empty: "\u6CA1\u6709\u53D1\u73B0\u53EF\u5BFC\u5165\u7684\u4F1A\u8BDD\u3002",
  truncated: "\u5DF2\u663E\u793A\u6700\u8FD1 {shown} \u6761\uFF0C\u672C\u673A\u5171\u53D1\u73B0 {total} \u6761\u3002\u53EF\u7528\u6807\u9898\u6216\u8DEF\u5F84\u7EE7\u7EED\u7B5B\u9009\u3002",
  skillsEmpty: "\u6CA1\u6709\u53D1\u73B0\u53EF\u5BFC\u5165\u7684\u6280\u80FD\u3002",
  memoryEmpty: "\u6CA1\u6709\u53D1\u73B0\u53EF\u5BFC\u5165\u7684\u8BB0\u5FC6\u6587\u4EF6\u3002",
  automationsEmpty: "\u6CA1\u6709\u53D1\u73B0\u53EF\u5BFC\u5165\u7684\u81EA\u52A8\u5316\u3002",
  sourceFilter: "\u6765\u6E90",
  sourceAll: "\u5168\u90E8",
  sourceClaude: "Claude Code",
  sourceCodex: "Codex",
  sourceCursor: "Cursor",
  sourceGrok: "Grok Build",
  search: "\u6309\u6807\u9898\u6216\u8DEF\u5F84\u7B5B\u9009",
  imported: "\u5BFC\u5165\u5B8C\u6210\uFF08\u65B0\u5BFC\u5165 / \u5DF2\u5B58\u5728\uFF09",
  importedSkills: "\u6280\u80FD\u5DF2\u590D\u5236\u5230 ~/.dsh/skills\u3002",
  importedMemory: "\u8BB0\u5FC6\u5DF2\u590D\u5236\uFF08\u6587\u4EF6 / \u5408\u5E76\u8FDB AGENTS.md\uFF09",
  importedAutomations: "\u81EA\u52A8\u5316\u5BFC\u5165\u5B8C\u6210\uFF08\u65B0\u5EFA / \u5DF2\u5B58\u5728 / \u4E0D\u652F\u6301\uFF09",
  failed: "\u90E8\u5206\u9879\u76EE\u5BFC\u5165\u5931\u8D25\u3002",
  error: "\u6682\u65F6\u65E0\u6CD5\u626B\u63CF\u672C\u673A\u4F1A\u8BDD\u3002",
  retry: "\u91CD\u8BD5",
  cwd: "\u5DE5\u4F5C\u76EE\u5F55",
  nativeId: "\u539F\u59CB id",
  bytes: "\u5927\u5C0F",
  commandHint: "\u4E5F\u53EF\u4EE5\u5728\u5BF9\u8BDD\u91CC\u7528 /import list\u3001/import all\u3001/import skills\u3001/import memory\u3001/import automations\u3002"
};
var en = {
  nav: "Import",
  title: "Import other AI sessions",
  intro: "Scan local Cursor, Codex, Claude Code, and Grok Build conversations, skills, memory, and automations. Imports stay in the original project directory and create a workspace when it is missing.",
  sessionsTab: "Sessions",
  skillsTab: "Skills",
  memoryTab: "Memory",
  automationsTab: "Automations",
  refresh: "Rescan",
  refreshing: "Scanning\u2026",
  importSelected: "Import selected",
  importAll: "Import all",
  importing: "Importing\u2026",
  importProgress: "Importing {done}/{total}",
  empty: "No foreign sessions found.",
  truncated: "Showing the newest {shown} of {total} conversations. Filter by title or path to narrow the list.",
  skillsEmpty: "No foreign skills found.",
  memoryEmpty: "No foreign memory files found.",
  automationsEmpty: "No foreign automations found.",
  sourceFilter: "Source",
  sourceAll: "All",
  sourceClaude: "Claude Code",
  sourceCodex: "Codex",
  sourceCursor: "Cursor",
  sourceGrok: "Grok Build",
  search: "Filter by title or path",
  imported: "Import finished (new / already present).",
  importedSkills: "Skills copied into ~/.dsh/skills.",
  importedMemory: "Memory copied (files / merged into AGENTS.md).",
  importedAutomations: "Automations imported (new / already present / unsupported).",
  failed: "Some items failed to import.",
  error: "Could not scan local sessions.",
  retry: "Retry",
  cwd: "Working directory",
  nativeId: "Native id",
  bytes: "Size",
  commandHint: "You can also run /import list, /import all, /import skills, /import memory, or /import automations in chat."
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
  const t = ctx.locale.bind(NS);
  const call = sessionImportCaller(ctx);
  const injected = () => ({
    listSessions: (source, query) => call("listSessions", {
      ...source === void 0 ? {} : { source },
      ...query === void 0 || query.length === 0 ? {} : { query }
    }),
    importSessions: (paths) => call("importSessions", { paths }),
    importOneSession: (path) => call("importOneSession", { path }),
    listSkills: () => call("listSkills"),
    importSkills: (paths) => call("importSkills", { paths }),
    listMemories: () => call("listMemories"),
    importMemories: (paths) => call("importMemories", { paths }),
    listAutomations: () => call("listAutomations"),
    importAutomations: (paths) => call("importAutomations", { paths })
  });
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "session-import",
    order: 16,
    label: () => t("nav"),
    locale: NS,
    inject: injected
  }, SessionImportSection));
}

return module.exports; } });
