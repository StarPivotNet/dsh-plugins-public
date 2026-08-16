window.__ModuleLoader__.load({ id: "@starpivot/dsh-plugin-marketplace", factory: (require) => {
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
var import_react3 = require("react");
var import_client = require("react-dom/client");

// src/client/MarketplaceSettingsSection.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/confirm-install.ts
function installSourceLabel(sourceTitle, homepage) {
  const titled = sourceTitle.trim();
  if (titled.length > 0) return titled;
  try {
    const host = new URL(homepage).host;
    if (host.length > 0) return host;
  } catch {
  }
  return homepage.trim();
}
function confirmInstallMessage(t, entry) {
  const version = entry.version.trim().length > 0 ? entry.version.trim() : "latest";
  return t("confirmInstallNamed", {
    name: entry.name,
    version,
    source: installSourceLabel(entry.sourceTitle, entry.homepage)
  });
}

// src/client/MarketplaceSettingsSection.module.css
var css = '._6t61hG_section{width:100%;max-width:none;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}._6t61hG_heading{margin:0;font-size:18px;font-weight:600}._6t61hG_intro,._6t61hG_status,._6t61hG_empty,._6t61hG_restart,._6t61hG_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}._6t61hG_restart{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:8px 12px}._6t61hG_failure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;font-size:13px;line-height:20px;display:flex}._6t61hG_failure p{margin:0}._6t61hG_tabs{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:flex-end;gap:22px;margin-top:2px;display:flex}._6t61hG_tab{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;padding:7px 1px 9px;font-size:13px;line-height:20px;position:relative}._6t61hG_tab:hover,._6t61hG_tab[data-active=true]{color:var(--dsw-alias-label-primary)}._6t61hG_tab[data-active=true]:after,._6t61hG_tab:focus-visible:after{background:var(--dsw-alias-label-primary);content:"";border-radius:2px 2px 0 0;height:2px;position:absolute;bottom:-1px;left:0;right:0}._6t61hG_tab:focus-visible,._6t61hG_button:focus-visible,._6t61hG_search input:focus-visible,._6t61hG_field input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._6t61hG_panel{flex-direction:column;gap:12px;min-width:0;padding-top:2px;display:flex}._6t61hG_search{width:100%;color:var(--dsw-alias-label-tertiary);align-items:center;display:flex;position:relative}._6t61hG_search>svg{pointer-events:none;position:absolute;left:12px}._6t61hG_search input,._6t61hG_field input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:36px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;outline:none;padding:0 12px;font-size:13px}._6t61hG_search input{padding-left:36px}._6t61hG_headingRow{align-items:baseline;gap:7px;padding:0 2px;display:flex}._6t61hG_headingRow h3{margin:0;font-size:13px;font-weight:600;line-height:20px}._6t61hG_headingRow span{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}._6t61hG_cards{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0;padding:0;list-style:none;display:grid}._6t61hG_list,._6t61hG_configList{flex-direction:column;gap:10px;margin:0;padding:0;list-style:none;display:flex}._6t61hG_configList>*{min-width:0}._6t61hG_marketRow{gap:8px;display:flex}._6t61hG_sources{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}._6t61hG_source{color:var(--dsw-alias-label-secondary);flex-wrap:wrap;gap:8px 12px;font-size:12px;line-height:18px;display:flex}._6t61hG_source[data-ok=false]{color:var(--dsw-alias-state-error-primary)}._6t61hG_sourceLabel{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px;line-height:16px}._6t61hG_card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;flex-direction:column;gap:6px;min-width:0;padding:10px 12px;display:flex;overflow:hidden}._6t61hG_cardTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;margin:0;font-size:13px;font-weight:600;line-height:18px;overflow:hidden}._6t61hG_packageName,._6t61hG_description{min-width:0;color:var(--dsw-alias-label-secondary);margin:0;font-size:11px;line-height:16px;overflow:hidden}._6t61hG_packageName{font-family:var(--ds-font-family-code);text-overflow:ellipsis;white-space:nowrap}._6t61hG_description{-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box}._6t61hG_actions{flex-wrap:wrap;gap:6px;margin-top:auto;display:flex}._6t61hG_button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px;font-size:12px;line-height:18px}._6t61hG_button:disabled{opacity:.55;cursor:default}._6t61hG_tag{text-overflow:ellipsis;background:var(--dsw-alias-bg-layer-1);max-width:100%;min-height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:5px;align-self:flex-start;align-items:center;padding:1px 6px;font-size:11px;line-height:16px;display:inline-flex;overflow:hidden}._6t61hG_field{flex-direction:column;gap:6px;display:flex}._6t61hG_field label{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}._6t61hG_visuallyHidden{clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}._6t61hG_reloadToast{z-index:1200;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);max-width:360px;box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);border-radius:10px;flex-direction:column;gap:4px;padding:10px 14px;font-size:12px;line-height:18px;display:flex;position:fixed;bottom:24px;right:24px}._6t61hG_reloadToast strong{font-size:13px}';
var tagId = "plugin-marketplace/MarketplaceSettingsSection.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "@starpivot/dsh-plugin-marketplace";
  tag.dataset.pluginCss = tagId;
  tag.textContent = css;
  document.head.appendChild(tag);
}
var MarketplaceSettingsSection_default = { "cardTitle": "_6t61hG_cardTitle", "card": "_6t61hG_card", "tab": "_6t61hG_tab", "restart": "_6t61hG_restart", "description": "_6t61hG_description", "visuallyHidden": "_6t61hG_visuallyHidden", "heading": "_6t61hG_heading", "reloadToast": "_6t61hG_reloadToast", "button": "_6t61hG_button", "configList": "_6t61hG_configList", "sources": "_6t61hG_sources", "headingRow": "_6t61hG_headingRow", "field": "_6t61hG_field", "cards": "_6t61hG_cards", "intro": "_6t61hG_intro", "failure": "_6t61hG_failure", "list": "_6t61hG_list", "marketRow": "_6t61hG_marketRow", "source": "_6t61hG_source", "panel": "_6t61hG_panel", "tag": "_6t61hG_tag", "status": "_6t61hG_status", "hint": "_6t61hG_hint", "search": "_6t61hG_search", "empty": "_6t61hG_empty", "actions": "_6t61hG_actions", "tabs": "_6t61hG_tabs", "section": "_6t61hG_section", "sourceLabel": "_6t61hG_sourceLabel", "packageName": "_6t61hG_packageName" };

// src/client/MarketplaceSettingsSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function matches(haystacks, query) {
  if (query.length === 0) return true;
  return haystacks.some((value) => value.toLocaleLowerCase().includes(query));
}
function MarketplaceSettingsSection({
  t,
  renderSlot,
  listInstalled,
  listCatalog,
  install,
  uninstall,
  setEnabled,
  catalogUrls,
  setCatalogUrls
}) {
  const tabsId = (0, import_react.useId)();
  const [tab, setTab] = (0, import_react.useState)("discover");
  const [query, setQuery] = (0, import_react.useState)("");
  const [restart, setRestart] = (0, import_react.useState)(false);
  const [notice, setNotice] = (0, import_react.useState)(null);
  const [draftUrls, setDraftUrls] = (0, import_react.useState)(
    catalogUrls.length > 0 ? [...catalogUrls] : [""]
  );
  const [savingUrl, setSavingUrl] = (0, import_react.useState)(false);
  const [busyName, setBusyName] = (0, import_react.useState)(null);
  const [catalogRequest, setCatalogRequest] = (0, import_react.useState)(0);
  const [installedRequest, setInstalledRequest] = (0, import_react.useState)(0);
  const [catalog, setCatalog] = (0, import_react.useState)({ status: "loading" });
  const [installed, setInstalled] = (0, import_react.useState)({ status: "loading" });
  (0, import_react.useEffect)(() => {
    let current = true;
    void Promise.resolve().then(() => listCatalog()).then(
      (snapshot) => {
        if (current) setCatalog({ status: "ready", value: snapshot });
      },
      () => {
        if (current) setCatalog({ status: "error" });
      }
    );
    return () => {
      current = false;
    };
  }, [listCatalog, catalogRequest]);
  (0, import_react.useEffect)(() => {
    let current = true;
    void Promise.resolve().then(() => listInstalled()).then(
      (snapshot) => {
        if (current) setInstalled({ status: "ready", value: snapshot.entries });
      },
      () => {
        if (current) setInstalled({ status: "error" });
      }
    );
    return () => {
      current = false;
    };
  }, [listInstalled, installedRequest]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const catalogEntries = catalog.status === "ready" ? catalog.value.entries : [];
  const installedEntries = installed.status === "ready" ? installed.value : [];
  const installedNames = (0, import_react.useMemo)(
    () => new Set(installedEntries.map((entry) => entry.packageName)),
    [installedEntries]
  );
  const filteredCatalog = catalogEntries.filter((entry) => matches([entry.name, entry.title, entry.description], normalizedQuery));
  const filteredInstalled = installedEntries.filter((entry) => matches([entry.packageName, entry.spec], normalizedQuery));
  const refreshAll = () => {
    setCatalog({ status: "loading" });
    setInstalled({ status: "loading" });
    setCatalogRequest((value) => value + 1);
    setInstalledRequest((value) => value + 1);
  };
  const runMutation = async (name, work) => {
    setBusyName(name);
    setNotice(null);
    const result = await work();
    setBusyName(null);
    if (!result.ok) {
      setNotice(result.message ?? t("error"));
      return;
    }
    if (result.restartRequired === true) setRestart(true);
    refreshAll();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.section, "aria-busy": catalog.status === "loading" || installed.status === "loading", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: MarketplaceSettingsSection_default.heading, children: t("title") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.intro, children: t("intro") }),
    restart ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.restart, role: "status", children: t("restart") }) : null,
    notice !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.failure, role: "alert", children: notice }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: MarketplaceSettingsSection_default.tabs, role: "tablist", "aria-label": t("tabs"), children: ["discover", "installed", "configure"].map((id) => {
      const selected = tab === id;
      const label = id === "discover" ? "discoverTab" : id === "installed" ? "installedTab" : "configureTab";
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          id: `${tabsId}-tab-${id}`,
          type: "button",
          role: "tab",
          className: MarketplaceSettingsSection_default.tab,
          "aria-selected": selected,
          "aria-controls": `${tabsId}-panel-${id}`,
          "data-active": selected ? "true" : void 0,
          onClick: () => {
            setTab(id);
          },
          children: t(label)
        },
        id
      );
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        id: `${tabsId}-panel-${tab}`,
        className: MarketplaceSettingsSection_default.panel,
        role: "tabpanel",
        "aria-labelledby": `${tabsId}-tab-${tab}`,
        children: [
          tab !== "configure" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: MarketplaceSettingsSection_default.search, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconSearchOutline16, { "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: MarketplaceSettingsSection_default.visuallyHidden, children: t("search") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "search",
                value: query,
                placeholder: t("search"),
                "aria-label": t("search"),
                onChange: (event) => {
                  setQuery(event.currentTarget.value);
                }
              }
            )
          ] }) : null,
          tab === "discover" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            DiscoverPage,
            {
              t,
              catalog,
              filtered: filteredCatalog,
              installedNames,
              busyName,
              draftUrls,
              savingUrl,
              onDraftUrls: setDraftUrls,
              onSaveUrl: async () => {
                setSavingUrl(true);
                const urls = draftUrls.map((url) => url.trim()).filter((url) => url.length > 0);
                await setCatalogUrls(urls);
                setDraftUrls(urls.length > 0 ? urls : [""]);
                setSavingUrl(false);
                setCatalog({ status: "loading" });
                setCatalogRequest((value) => value + 1);
              },
              onRetry: () => {
                setCatalog({ status: "loading" });
                setCatalogRequest((value) => value + 1);
              },
              onInstall: (name, version) => void runMutation(name, () => install(name, version))
            }
          ) : null,
          tab === "installed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            InstalledPage,
            {
              t,
              installed,
              filtered: filteredInstalled,
              busyName,
              onRetry: () => {
                setInstalled({ status: "loading" });
                setInstalledRequest((value) => value + 1);
              },
              onUninstall: (name) => void runMutation(name, () => uninstall(name)),
              onToggle: (entryId, enabled, packageName) => void runMutation(packageName, () => setEnabled(entryId, enabled))
            }
          ) : null,
          tab === "configure" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfigurePage, { t, renderCards: () => renderSlot("settings.plugin.item", {}) }) : null
        ]
      }
    )
  ] });
}
function DiscoverPage(props) {
  const { t } = props;
  const sources = props.catalog.status === "ready" ? props.catalog.value.sources : [];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.field, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { id: "marketplace-catalog-urls", children: t("markets") }),
      props.draftUrls.map((url, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.marketRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            "aria-labelledby": "marketplace-catalog-urls",
            placeholder: t("marketUrl"),
            value: url,
            onChange: (event) => {
              const next = [...props.draftUrls];
              next[index] = event.currentTarget.value;
              props.onDraftUrls(next);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: MarketplaceSettingsSection_default.button,
            onClick: () => {
              const next = props.draftUrls.filter((_, itemIndex) => itemIndex !== index);
              props.onDraftUrls(next.length > 0 ? next : [""]);
            },
            children: t("removeMarket")
          }
        )
      ] }, `market-${String(index)}`)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.hint, children: t("marketUrlHint") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.actions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: MarketplaceSettingsSection_default.button,
            onClick: () => {
              props.onDraftUrls([...props.draftUrls, ""]);
            },
            children: t("addMarket")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: MarketplaceSettingsSection_default.button, disabled: props.savingUrl, onClick: props.onSaveUrl, children: props.savingUrl ? t("catalogSaving") : t("catalogSave") })
      ] })
    ] }),
    sources.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: MarketplaceSettingsSection_default.sources, children: sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: MarketplaceSettingsSection_default.source, "data-ok": source.ok ? "true" : "false", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: source.title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: source.url }),
      source.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: source.count }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        t("marketFailed"),
        source.error !== void 0 ? `: ${source.error}` : ""
      ] })
    ] }, source.url)) }) : null,
    props.catalog.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.status, children: t("loading") }) : null,
    props.catalog.status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.failure, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: t("error") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: MarketplaceSettingsSection_default.button, onClick: props.onRetry, children: t("retry") })
    ] }) : null,
    props.catalog.status === "ready" && !props.catalog.value.configured ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.empty, children: t("catalogUnconfigured") }) : null,
    props.catalog.status === "ready" && props.catalog.value.configured && props.catalog.value.entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.empty, children: t("catalogEmpty") }) : null,
    props.catalog.status === "ready" && props.catalog.value.entries.length > 0 && props.filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.empty, children: t("emptySearch") }) : null,
    props.filtered.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.headingRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("catalog") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: props.filtered.length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: MarketplaceSettingsSection_default.cards, children: props.filtered.map((entry) => {
        const already = props.installedNames.has(entry.name);
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: MarketplaceSettingsSection_default.card, "data-plugin-name": entry.name, children: [
          already ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: MarketplaceSettingsSection_default.tag, children: t("installedTag") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: MarketplaceSettingsSection_default.tag, children: entry.sourceTitle }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: MarketplaceSettingsSection_default.cardTitle, title: entry.title, children: entry.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: MarketplaceSettingsSection_default.packageName, title: entry.name + (entry.version.length > 0 ? "@" + entry.version : ""), children: [
            entry.name,
            entry.version.length > 0 ? `@${entry.version}` : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.description, children: entry.description }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: MarketplaceSettingsSection_default.actions, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: MarketplaceSettingsSection_default.button,
              disabled: already || props.busyName === entry.name,
              onClick: () => {
                if (globalThis.confirm(confirmInstallMessage(t, entry))) {
                  props.onInstall(entry.name, entry.version.length > 0 ? entry.version : void 0);
                }
              },
              children: props.busyName === entry.name ? t("installing") : t("install")
            }
          ) })
        ] }, entry.name);
      }) })
    ] }) : null
  ] });
}
function InstalledPage(props) {
  const { t } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    props.installed.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.status, children: t("loading") }) : null,
    props.installed.status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.failure, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: t("error") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: MarketplaceSettingsSection_default.button, onClick: props.onRetry, children: t("retry") })
    ] }) : null,
    props.installed.status === "ready" && props.installed.value.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.empty, children: t("installedEmpty") }) : null,
    props.installed.status === "ready" && props.installed.value.length > 0 && props.filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.empty, children: t("emptySearch") }) : null,
    props.filtered.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.headingRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("installedHeading") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: props.filtered.length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: MarketplaceSettingsSection_default.cards, children: props.filtered.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: MarketplaceSettingsSection_default.card, "data-plugin-name": entry.packageName, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: MarketplaceSettingsSection_default.tag, children: t(entry.kind === "inbox" ? "inboxTag" : entry.kind === "bundle" ? "bundleTag" : "dependencyTag") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: MarketplaceSettingsSection_default.cardTitle, title: entry.packageName, children: entry.packageName }),
        entry.spec.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.packageName, title: entry.spec, children: entry.spec }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.actions, children: [
          entry.canToggle && entry.entryIds[0] !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: MarketplaceSettingsSection_default.button,
              disabled: props.busyName === entry.packageName,
              onClick: () => {
                props.onToggle(entry.entryIds[0], !entry.enabled, entry.packageName);
              },
              children: entry.enabled ? t("disable") : t("enable")
            }
          ) : null,
          entry.canUninstall ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: MarketplaceSettingsSection_default.button,
              disabled: props.busyName === entry.packageName,
              onClick: () => {
                if (globalThis.confirm(t("confirmUninstall"))) props.onUninstall(entry.packageName);
              },
              children: props.busyName === entry.packageName ? t("uninstalling") : t("uninstall")
            }
          ) : null
        ] })
      ] }, entry.packageName)) })
    ] }) : null
  ] });
}
function ConfigurePage(props) {
  const cards = props.renderCards();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: MarketplaceSettingsSection_default.headingRow, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: props.t("cards") }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: MarketplaceSettingsSection_default.configList, children: cards })
  ] });
}

// src/client/ReloadProgressToast.tsx
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
function ReloadProgressToast(props) {
  const progress = props.progress;
  const [visible, setVisible] = (0, import_react2.useState)(false);
  (0, import_react2.useEffect)(() => {
    if (progress === void 0 || progress.phase === "idle") {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (progress.phase !== "done") return;
    const timer = setTimeout(() => {
      setVisible(false);
    }, 4e3);
    return () => {
      clearTimeout(timer);
    };
  }, [progress?.phase, progress?.index, progress?.message]);
  if (!visible || progress === void 0 || progress.phase === "idle") return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: MarketplaceSettingsSection_default.reloadToast, role: "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: progress.phase === "done" ? props.t("reloadDone") : props.t("reloadProgress") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: progress.message || progress.current })
  ] });
}

// src/client/locales.ts
var zh = {
  nav: "\u63D2\u4EF6",
  title: "\u63D2\u4EF6\u5E02\u573A",
  intro: "\u6D4F\u89C8\u53EF\u5B89\u88C5\u63D2\u4EF6\uFF0C\u5E76\u7BA1\u7406\u672C profile \u5DF2\u5B89\u88C5\u7684\u63D2\u4EF6\u3002",
  tabs: "\u63D2\u4EF6\u89C6\u56FE",
  discoverTab: "\u53D1\u73B0",
  installedTab: "\u5DF2\u5B89\u88C5",
  configureTab: "\u914D\u7F6E",
  search: "\u641C\u7D22\u63D2\u4EF6",
  catalog: "\u53EF\u5B89\u88C5\u63D2\u4EF6",
  catalogEmpty: "\u8FD9\u4E9B\u5E02\u573A\u91CC\u8FD8\u6CA1\u6709\u63D2\u4EF6\u3002",
  catalogUnconfigured: "\u5C1A\u672A\u914D\u7F6E\u8FDC\u7A0B\u63D2\u4EF6\u5E02\u573A\u3002\u5728\u4E0B\u65B9\u6DFB\u52A0\u4E00\u4E2A http(s) \u76EE\u5F55 URL\u3002",
  markets: "\u8FDC\u7A0B\u5E02\u573A",
  marketUrl: "\u5E02\u573A URL",
  marketUrlHint: "\u6BCF\u4E2A\u5E02\u573A\u662F\u4E00\u4EFD version \u4E3A 1 \u7684 JSON \u76EE\u5F55\u3002\u53EF\u6DFB\u52A0\u591A\u4E2A\u3002",
  addMarket: "\u6DFB\u52A0\u5E02\u573A",
  removeMarket: "\u79FB\u9664",
  catalogSave: "\u4FDD\u5B58\u5E02\u573A",
  catalogSaving: "\u4FDD\u5B58\u4E2D\u2026",
  marketFailed: "\u65E0\u6CD5\u8BFB\u53D6",
  install: "\u5B89\u88C5",
  installing: "\u5B89\u88C5\u4E2D\u2026",
  installedTag: "\u5DF2\u5B89\u88C5",
  restart: "\u5DF2\u5199\u5165 profile\u3002\u91CD\u542F dsh web \u540E\u65B0\u63D2\u4EF6\u624D\u4F1A\u51FA\u73B0\u3002",
  installedHeading: "\u672C profile \u7684\u63D2\u4EF6",
  installedEmpty: "\u8FD9\u4E2A profile \u8FD8\u6CA1\u6709\u989D\u5916\u63D2\u4EF6\u3002",
  uninstall: "\u5378\u8F7D",
  uninstalling: "\u5378\u8F7D\u4E2D\u2026",
  enable: "\u542F\u7528",
  disable: "\u505C\u7528",
  inboxTag: "\u968F\u5B89\u88C5\u5185\u7F6E",
  dependencyTag: "\u4F9D\u8D56",
  bundleTag: "\u7EC4\u5408\u5305",
  configuration: "\u914D\u7F6E",
  loading: "\u6B63\u5728\u8BFB\u53D6\u63D2\u4EF6\u2026",
  error: "\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u63D2\u4EF6\u3002",
  retry: "\u91CD\u8BD5",
  emptySearch: "\u6CA1\u6709\u5339\u914D\u7684\u63D2\u4EF6\u3002",
  confirmInstall: "\u5B89\u88C5\u8FD9\u4E2A\u63D2\u4EF6\uFF1F",
  confirmInstallNamed: "\u5B89\u88C5 {name}@{version}\uFF1F\u6765\u6E90\uFF1A{source}",
  confirmUninstall: "\u5378\u8F7D\u8FD9\u4E2A\u63D2\u4EF6\uFF1F",
  cancel: "\u53D6\u6D88",
  cards: "\u53EF\u914D\u7F6E\u63D2\u4EF6",
  configureEmpty: "\u8FD9\u4E2A\u90E8\u7F72\u6CA1\u6709\u53EF\u914D\u7F6E\u7684\u63D2\u4EF6\u3002",
  reloadProgress: "\u6B63\u5728\u91CD\u8F7D\u63D2\u4EF6",
  reloadDone: "\u91CD\u8F7D\u5B8C\u6210"
};
var en = {
  nav: "Plugins",
  title: "Plugin marketplace",
  intro: "Browse installable plugins and manage the plugins in this profile.",
  tabs: "Plugin views",
  discoverTab: "Discover",
  installedTab: "Installed",
  configureTab: "Configure",
  search: "Search plugins",
  catalog: "Installable plugins",
  catalogEmpty: "These marketplaces have no plugins yet.",
  catalogUnconfigured: "No remote marketplace is configured. Add an http(s) catalog URL below.",
  markets: "Remote marketplaces",
  marketUrl: "Marketplace URL",
  marketUrlHint: "Each marketplace is a version-1 JSON catalog. Add as many as you need.",
  addMarket: "Add marketplace",
  removeMarket: "Remove",
  catalogSave: "Save marketplaces",
  catalogSaving: "Saving\u2026",
  marketFailed: "Unavailable",
  install: "Install",
  installing: "Installing\u2026",
  installedTag: "Installed",
  restart: "Written to the profile. Restart dsh web before new plugins appear.",
  installedHeading: "Plugins in this profile",
  installedEmpty: "This profile has no extra plugins.",
  uninstall: "Uninstall",
  uninstalling: "Uninstalling\u2026",
  enable: "Enable",
  disable: "Disable",
  inboxTag: "In-box",
  dependencyTag: "Dependency",
  bundleTag: "Bundle",
  configuration: "Configuration",
  loading: "Reading plugins\u2026",
  error: "Plugins are temporarily unavailable.",
  retry: "Retry",
  emptySearch: "No matching plugins.",
  confirmInstall: "Install this plugin?",
  confirmInstallNamed: "Install {name}@{version}? Source: {source}",
  confirmUninstall: "Uninstall this plugin?",
  cancel: "Cancel",
  cards: "Configurable plugins",
  configureEmpty: "This deployment exposes no plugin settings.",
  reloadProgress: "Reloading plugins",
  reloadDone: "Reload finished"
};

// src/client/index.ts
var NS = "settings.pluginMarketplace";
var inject = ["slots", "locale", "settingsScope", "connection"];
function marketplaceCaller(ctx) {
  const rpc = ctx.get("connection").rpc;
  return async (method, body) => {
    const payload = await rpc.call("/plugin-marketplace", method, body ?? {});
    if (!payload.ok) {
      throw new Error("pluginMarketplace." + method + " failed: " + payload.error.message);
    }
    return payload.value;
  };
}
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "plugin-marketplace: dictionaries");
  ctx.provide("pluginMarketplaceUi", true);
  const t = ctx.locale.bind(NS);
  const catalogScope = ctx.settingsScope.bind({
    namespace: "plugin-marketplace"
  });
  const callMarketplace = marketplaceCaller(ctx);
  let lastReloadNonce = catalogScope.getSnapshot().value?.reloadNonce ?? 0;
  const host = document.createElement("div");
  host.dataset.pluginMarketplaceReload = "true";
  document.body.append(host);
  const root = (0, import_client.createRoot)(host);
  const renderToast = () => {
    root.render((0, import_react3.createElement)(ReloadProgressToast, {
      progress: catalogScope.getSnapshot().value?.reloadProgress,
      t
    }));
  };
  renderToast();
  ctx.effect(() => catalogScope.subscribe(() => {
    const snapshot = catalogScope.getSnapshot().value;
    const next = snapshot?.reloadNonce ?? lastReloadNonce;
    if (next !== lastReloadNonce) {
      lastReloadNonce = next;
      void fetch("/plugins/reload", { method: "POST" }).catch(() => {
      });
    }
    renderToast();
  }), "plugin-marketplace: browser reload on nonce");
  ctx.effect(() => () => {
    root.unmount();
    host.remove();
  }, "plugin-marketplace: reload toast");
  const mutation = (value) => {
    if (!value.ok) return { ok: false, message: value.message };
    return value.restartRequired === true ? { ok: true, restartRequired: true } : { ok: true };
  };
  const injected = () => ({
    listInstalled: () => callMarketplace("listInstalled"),
    listCatalog: () => callMarketplace("listCatalog"),
    install: async (name, version) => mutation(await callMarketplace(
      "install",
      version === void 0 ? { name } : { name, version }
    )),
    uninstall: async (name) => mutation(await callMarketplace("uninstall", { name })),
    setEnabled: async (entryId, enabled) => mutation(await callMarketplace("setEnabled", { entryId, enabled })),
    catalogUrls: catalogScope.getSnapshot().value?.catalogUrls ?? [],
    setCatalogUrls: async (value) => {
      await catalogScope.set("catalogUrls", value);
    }
  });
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "plugins",
    order: 15,
    label: () => t("nav"),
    locale: NS,
    inject: injected,
    children: { "settings.plugin.item": { kind: "list", scope: "root" } }
  }, MarketplaceSettingsSection));
}

return module.exports; } });
