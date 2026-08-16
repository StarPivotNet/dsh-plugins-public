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
  MARKETPLACE_CLIENT_PACKAGE: () => MARKETPLACE_CLIENT_PACKAGE,
  NS: () => NS,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react4 = require("react");
var import_client = require("react-dom/client");

// src/client/MarketplaceSettingsSection.tsx
var import_react = require("react");
var import_react_dom = require("react-dom");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/catalog-label.ts
function catalogPackageLabel(name, version) {
  return version.length > 0 ? `${name}@${version}` : name;
}
function installedHoverLabel(packageName, spec) {
  return spec.length > 0 ? `${packageName}
${spec}` : packageName;
}

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
var css = '.DYfBnq_section{width:100%;max-width:none;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}.DYfBnq_heading{margin:0;font-size:18px;font-weight:600}.DYfBnq_status,.DYfBnq_empty,.DYfBnq_restart{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.DYfBnq_restart{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:8px 12px}.DYfBnq_failure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;font-size:13px;line-height:20px;display:flex}.DYfBnq_failure p{margin:0}.DYfBnq_tabs{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:flex-end;gap:22px;margin-top:2px;display:flex}.DYfBnq_tab{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;padding:7px 1px 9px;font-size:13px;line-height:20px;position:relative}.DYfBnq_tab:hover,.DYfBnq_tab[data-active=true]{color:var(--dsw-alias-label-primary)}.DYfBnq_tab[data-active=true]:after,.DYfBnq_tab:focus-visible:after{background:var(--dsw-alias-label-primary);content:"";border-radius:2px 2px 0 0;height:2px;position:absolute;bottom:-1px;left:0;right:0}.DYfBnq_tab:focus-visible,.DYfBnq_button:focus-visible,.DYfBnq_iconButton:focus-visible,.DYfBnq_cardHit:focus-visible,.DYfBnq_dialogClose:focus-visible,.DYfBnq_search input:focus-visible,.DYfBnq_field input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.DYfBnq_panel{flex-direction:column;gap:12px;min-width:0;padding-top:2px;display:flex}.DYfBnq_search{width:100%;color:var(--dsw-alias-label-tertiary);align-items:center;display:flex;position:relative}.DYfBnq_search>svg{pointer-events:none;position:absolute;left:12px}.DYfBnq_search input,.DYfBnq_field input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:36px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;outline:none;padding:0 12px;font-size:13px}.DYfBnq_search input{padding-left:36px}.DYfBnq_headingRow{align-items:baseline;gap:7px;padding:0 2px;display:flex}.DYfBnq_headingRow h3{margin:0;font-size:13px;font-weight:600;line-height:20px}.DYfBnq_headingRow span{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}.DYfBnq_cards{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0;padding:0;list-style:none;display:grid}.DYfBnq_catalogCards{grid-template-columns:repeat(2,minmax(0,1fr))}.DYfBnq_list{flex-direction:column;gap:10px;margin:0;padding:0;list-style:none;display:flex}.DYfBnq_configList{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0;padding:0;list-style:none;display:grid}.DYfBnq_configList>*{min-width:0}.DYfBnq_filters{flex-wrap:wrap;gap:6px;display:flex}.DYfBnq_filter{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border-radius:999px;padding:3px 10px;font-size:12px;line-height:18px}.DYfBnq_filter[data-active=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.DYfBnq_marketRow{align-items:center;gap:8px;display:flex}.DYfBnq_sources{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}.DYfBnq_source{color:var(--dsw-alias-label-secondary);align-items:center;gap:8px 12px;font-size:12px;line-height:18px;display:flex}.DYfBnq_sourceMain{flex-wrap:wrap;flex:1;align-items:baseline;gap:8px 12px;min-width:0;display:flex}.DYfBnq_sourceActions{flex:none;align-items:center;gap:2px;display:flex}.DYfBnq_source[data-ok=false]{color:var(--dsw-alias-state-error-primary)}.DYfBnq_iconButton{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.DYfBnq_iconButton:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.DYfBnq_iconButton:disabled{opacity:.55;cursor:default}.DYfBnq_spin{animation:.8s linear infinite DYfBnq_marketplace-spin}@media (prefers-reduced-motion:reduce){.DYfBnq_spin{animation:none}}@keyframes DYfBnq_marketplace-spin{to{transform:rotate(360deg)}}.DYfBnq_sourceLabel{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px;line-height:16px}.DYfBnq_card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;flex-direction:column;gap:6px;min-width:0;padding:10px 12px;display:flex;overflow:hidden}.DYfBnq_catalogCard{flex-direction:column;gap:8px;display:flex}.DYfBnq_catalogCard:hover{background:var(--dsw-alias-interactive-bg-hover)}.DYfBnq_cardBody{min-width:0;max-width:100%}.DYfBnq_cardHit{width:100%;min-width:0;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;flex-direction:column;align-items:flex-start;gap:6px;margin:0;padding:0;display:flex}.DYfBnq_cardAside{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.DYfBnq_cardAside .DYfBnq_button{white-space:nowrap}.DYfBnq_cardTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;margin:0;font-size:13px;font-weight:600;line-height:18px;overflow:hidden}.DYfBnq_packageName,.DYfBnq_description{min-width:0;color:var(--dsw-alias-label-secondary);margin:0;font-size:11px;line-height:16px;overflow:hidden}.DYfBnq_packageName{font-family:var(--ds-font-family-code);text-overflow:ellipsis;white-space:nowrap}.DYfBnq_description{-webkit-line-clamp:2;-webkit-box-orient:vertical;width:100%;display:-webkit-box}.DYfBnq_actions{flex-wrap:wrap;gap:6px;margin-top:auto;display:flex}.DYfBnq_button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px;font-size:12px;line-height:18px}.DYfBnq_button:disabled{opacity:.55;cursor:default}.DYfBnq_tag{text-overflow:ellipsis;background:var(--dsw-alias-bg-layer-1);max-width:100%;min-height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:5px;align-self:flex-start;align-items:center;padding:1px 6px;font-size:11px;line-height:16px;display:inline-flex;overflow:hidden}.DYfBnq_field{flex-direction:column;gap:6px;display:flex}.DYfBnq_field label{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.DYfBnq_visuallyHidden{clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}.DYfBnq_dialogRoot{z-index:1100;justify-content:center;align-items:center;padding:24px;display:flex;position:fixed;inset:0}.DYfBnq_dialogMask{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);position:absolute;inset:0}.DYfBnq_dialog{z-index:1;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-alias-bg-layer-2);width:min(440px,100%);max-height:min(640px,100vh - 48px);box-shadow:var(--dsw-shadow-lv3);border-radius:16px;flex-direction:column;gap:16px;padding:20px 20px 18px;display:flex;position:relative;overflow:auto}.DYfBnq_dialogHeader{justify-content:space-between;align-items:flex-start;gap:8px;display:flex}.DYfBnq_dialogTitle{min-width:0;margin:0;font-size:16px;font-weight:600;line-height:24px}.DYfBnq_dialogClose{cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;display:inline-flex}.DYfBnq_dialogClose:hover{background:var(--dsw-alias-interactive-bg-hover)}.DYfBnq_dialogMeta{flex-direction:column;gap:8px;margin:0;display:flex}.DYfBnq_dialogMeta>div{grid-template-columns:56px minmax(0,1fr);align-items:start;gap:10px;display:grid}.DYfBnq_dialogMeta dt{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.DYfBnq_dialogMeta dd{overflow-wrap:anywhere;white-space:pre-wrap;min-width:0;color:var(--dsw-alias-label-primary);margin:0;font-size:13px;line-height:18px}.DYfBnq_dialogMeta a{color:inherit}.DYfBnq_dialogCode{font-family:var(--ds-font-family-code);font-size:12px}.DYfBnq_dialogDescription{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);margin:0;font-size:13px;line-height:20px}.DYfBnq_dialogFooter{justify-content:flex-end;gap:8px;display:flex}.DYfBnq_reloadToast{z-index:1200;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);max-width:360px;box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);border-radius:10px;flex-direction:column;gap:4px;padding:10px 14px;font-size:12px;line-height:18px;display:flex;position:fixed;bottom:24px;right:24px}.DYfBnq_reloadToast strong{font-size:13px}';
var tagId = "plugin-marketplace/MarketplaceSettingsSection.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "@starpivot/dsh-plugin-marketplace";
  tag.dataset.pluginCss = tagId;
  tag.textContent = css;
  document.head.appendChild(tag);
}
var MarketplaceSettingsSection_default = { "visuallyHidden": "DYfBnq_visuallyHidden", "heading": "DYfBnq_heading", "headingRow": "DYfBnq_headingRow", "actions": "DYfBnq_actions", "panel": "DYfBnq_panel", "status": "DYfBnq_status", "empty": "DYfBnq_empty", "tab": "DYfBnq_tab", "configList": "DYfBnq_configList", "dialogMeta": "DYfBnq_dialogMeta", "catalogCard": "DYfBnq_catalogCard", "reloadToast": "DYfBnq_reloadToast", "dialogMask": "DYfBnq_dialogMask", "dialogHeader": "DYfBnq_dialogHeader", "marketplace-spin": "DYfBnq_marketplace-spin", "dialog": "DYfBnq_dialog", "tag": "DYfBnq_tag", "tabs": "DYfBnq_tabs", "dialogCode": "DYfBnq_dialogCode", "sourceMain": "DYfBnq_sourceMain", "dialogFooter": "DYfBnq_dialogFooter", "sourceLabel": "DYfBnq_sourceLabel", "packageName": "DYfBnq_packageName", "section": "DYfBnq_section", "cards": "DYfBnq_cards", "cardTitle": "DYfBnq_cardTitle", "description": "DYfBnq_description", "filter": "DYfBnq_filter", "card": "DYfBnq_card", "failure": "DYfBnq_failure", "filters": "DYfBnq_filters", "cardBody": "DYfBnq_cardBody", "restart": "DYfBnq_restart", "field": "DYfBnq_field", "catalogCards": "DYfBnq_catalogCards", "dialogTitle": "DYfBnq_dialogTitle", "dialogDescription": "DYfBnq_dialogDescription", "cardHit": "DYfBnq_cardHit", "sourceActions": "DYfBnq_sourceActions", "list": "DYfBnq_list", "cardAside": "DYfBnq_cardAside", "button": "DYfBnq_button", "search": "DYfBnq_search", "source": "DYfBnq_source", "spin": "DYfBnq_spin", "dialogClose": "DYfBnq_dialogClose", "sources": "DYfBnq_sources", "dialogRoot": "DYfBnq_dialogRoot", "marketRow": "DYfBnq_marketRow", "iconButton": "DYfBnq_iconButton" };

// src/client/MarketplaceSettingsSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function matches(haystacks, query) {
  if (query.length === 0) return true;
  return haystacks.some((value) => value.toLocaleLowerCase().includes(query));
}
function requestInstall(t, entry, onInstall) {
  if (globalThis.confirm(confirmInstallMessage(t, entry))) {
    onInstall(entry.name, entry.version.length > 0 ? entry.version : void 0);
  }
}
function installedKindLabel(t, kind) {
  return t(kind === "inbox" ? "inboxTag" : kind === "bundle" ? "bundleTag" : "dependencyTag");
}
function MarketplaceSettingsSection({
  t,
  renderSlot,
  listInstalled,
  listCatalog,
  refreshCatalog,
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
  const [draftUrls, setDraftUrls] = (0, import_react.useState)([...catalogUrls]);
  const [savingUrl, setSavingUrl] = (0, import_react.useState)(false);
  const [refreshingUrl, setRefreshingUrl] = (0, import_react.useState)(null);
  const [busyName, setBusyName] = (0, import_react.useState)(null);
  const [installedRequest, setInstalledRequest] = (0, import_react.useState)(0);
  const [catalog, setCatalog] = (0, import_react.useState)({ status: "loading" });
  const [installed, setInstalled] = (0, import_react.useState)({ status: "loading" });
  (0, import_react.useEffect)(() => {
    let current = true;
    void Promise.resolve().then(() => listCatalog()).then(
      (snapshot) => {
        if (!current) return;
        setCatalog({ status: "ready", value: snapshot });
        setRefreshingUrl("all");
        void refreshCatalog().then(
          (fresh) => {
            if (current) setCatalog({ status: "ready", value: fresh });
          },
          () => {
            if (!current) return;
            if (snapshot.entries.length === 0) setNotice(t("error"));
          }
        ).finally(() => {
          if (current) setRefreshingUrl(null);
        });
      },
      () => {
        if (current) setCatalog({ status: "error" });
      }
    );
    return () => {
      current = false;
    };
  }, [listCatalog, refreshCatalog]);
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
  const refreshCatalogNow = async (url) => {
    setRefreshingUrl(url ?? "all");
    setNotice(null);
    try {
      const snapshot = await refreshCatalog(url);
      setCatalog({ status: "ready", value: snapshot });
    } catch {
      setNotice(t("error"));
    } finally {
      setRefreshingUrl(null);
    }
  };
  const refreshAll = () => {
    setInstalled({ status: "loading" });
    setInstalledRequest((value) => value + 1);
    void refreshCatalogNow();
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.section, "aria-busy": refreshingUrl !== null || installed.status === "loading", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: MarketplaceSettingsSection_default.heading, children: t("title") }),
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
              refreshingUrl,
              onDraftUrls: setDraftUrls,
              onSaveUrl: async (nextUrls) => {
                setSavingUrl(true);
                const urls = (nextUrls ?? draftUrls).map((url) => url.trim()).filter((url) => url.length > 0);
                await setCatalogUrls(urls);
                setDraftUrls(urls);
                setSavingUrl(false);
                await refreshCatalogNow();
              },
              onRefresh: (url) => void refreshCatalogNow(url),
              onRetry: () => {
                void refreshCatalogNow();
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
  const [details, setDetails] = (0, import_react.useState)(null);
  const [adding, setAdding] = (0, import_react.useState)(false);
  const [addUrl, setAddUrl] = (0, import_react.useState)("");
  const [editing, setEditing] = (0, import_react.useState)(null);
  const addRef = (0, import_react.useRef)(null);
  const sources = props.catalog.status === "ready" ? props.catalog.value.sources : [];
  (0, import_react.useEffect)(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);
  const savedUrls = () => {
    const listed = sources.map((source) => source.url);
    if (listed.length > 0) return listed;
    return props.draftUrls.map((url) => url.trim()).filter((url) => url.length > 0);
  };
  const commitUrls = (urls) => {
    const next = urls.map((url) => url.trim()).filter((url) => url.length > 0);
    props.onDraftUrls(next);
    props.onSaveUrl(next);
  };
  const removeSource = (url) => {
    if (!globalThis.confirm(t("confirmRemoveMarket"))) return;
    commitUrls(savedUrls().filter((item) => item !== url));
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.field, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { id: "marketplace-catalog-urls", children: t("markets") }),
      adding ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.marketRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            ref: addRef,
            "aria-labelledby": "marketplace-catalog-urls",
            placeholder: t("marketUrl"),
            value: addUrl,
            onChange: (event) => {
              setAddUrl(event.currentTarget.value);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: MarketplaceSettingsSection_default.button,
            disabled: props.savingUrl || addUrl.trim().length === 0,
            onClick: () => {
              commitUrls([...savedUrls(), addUrl]);
              setAddUrl("");
              setAdding(false);
            },
            children: props.savingUrl ? t("catalogSaving") : t("catalogSave")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: MarketplaceSettingsSection_default.button,
            onClick: () => {
              setAdding(false);
              setAddUrl("");
            },
            children: t("cancel")
          }
        )
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.actions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: MarketplaceSettingsSection_default.button,
            onClick: () => {
              setAdding(true);
              setAddUrl("");
            },
            children: t("addMarket")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: MarketplaceSettingsSection_default.button,
            disabled: props.refreshingUrl !== null,
            onClick: () => {
              props.onRefresh();
            },
            children: props.refreshingUrl === "all" ? t("refreshingCatalog") : t("refreshCatalog")
          }
        )
      ] })
    ] }),
    sources.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: MarketplaceSettingsSection_default.sources, children: sources.map((source) => {
      const sourceRefreshing = props.refreshingUrl === source.url || props.refreshingUrl === "all";
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: MarketplaceSettingsSection_default.source, "data-ok": source.ok ? "true" : "false", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.sourceMain, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: source.title }),
          source.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: source.count }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            t("marketFailed"),
            source.error !== void 0 ? `: ${source.error}` : ""
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.sourceActions, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tooltip, { label: t("refreshMarket"), side: "bottom", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: MarketplaceSettingsSection_default.iconButton,
              "aria-label": t("refreshMarket"),
              disabled: props.refreshingUrl !== null,
              onClick: () => {
                props.onRefresh(source.url);
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconRefreshOutline14, { className: sourceRefreshing ? MarketplaceSettingsSection_default.spin : void 0, size: 14 })
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tooltip, { label: t("editMarket"), side: "bottom", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: MarketplaceSettingsSection_default.iconButton,
              "aria-label": t("editMarket"),
              onClick: () => {
                setEditing({ from: source.url, value: source.url });
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconEditOutline16, { size: 14 })
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tooltip, { label: t("removeMarket"), side: "bottom", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: MarketplaceSettingsSection_default.iconButton,
              "aria-label": t("removeMarket"),
              disabled: props.savingUrl,
              onClick: () => {
                removeSource(source.url);
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 })
            }
          ) })
        ] })
      ] }, source.url);
    }) }) : null,
    props.catalog.status === "loading" && props.refreshingUrl === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.status, children: t("loading") }) : null,
    props.catalog.status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.failure, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: t("error") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: MarketplaceSettingsSection_default.button, onClick: props.onRetry, children: t("retry") })
    ] }) : null,
    props.refreshingUrl !== null && props.catalog.status === "ready" && props.catalog.value.entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.status, children: t("refreshingCatalog") }) : null,
    props.catalog.status === "ready" && !props.catalog.value.configured ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.empty, children: t("catalogUnconfigured") }) : null,
    props.catalog.status === "ready" && props.catalog.value.configured && props.catalog.value.entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.empty, children: t("catalogEmpty") }) : null,
    props.catalog.status === "ready" && props.catalog.value.entries.length > 0 && props.filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.empty, children: t("emptySearch") }) : null,
    props.filtered.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.headingRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("catalog") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: props.filtered.length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: `${MarketplaceSettingsSection_default.cards} ${MarketplaceSettingsSection_default.catalogCards}`, children: props.filtered.map((entry) => {
        const already = props.installedNames.has(entry.name);
        const packageLabel = catalogPackageLabel(entry.name, entry.version);
        const installing = props.busyName === entry.name;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: `${MarketplaceSettingsSection_default.card} ${MarketplaceSettingsSection_default.catalogCard}`, "data-plugin-name": entry.name, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: MarketplaceSettingsSection_default.cardBody, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_dsh_client_ui_primitives.Tooltip,
            {
              label: entry.description,
              side: "bottom",
              maxWidth: 280,
              disabled: entry.description.length === 0,
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "button",
                {
                  type: "button",
                  className: MarketplaceSettingsSection_default.cardHit,
                  "aria-haspopup": "dialog",
                  "aria-label": t("openDetailsNamed", { title: entry.title }),
                  onClick: () => {
                    setDetails(entry);
                  },
                  children: [
                    already ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: MarketplaceSettingsSection_default.tag, children: t("installedTag") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: MarketplaceSettingsSection_default.tag, children: entry.sourceTitle }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: MarketplaceSettingsSection_default.cardTitle, children: entry.title }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.packageName, children: packageLabel }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: MarketplaceSettingsSection_default.description, children: entry.description })
                  ]
                }
              )
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: MarketplaceSettingsSection_default.cardAside, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: MarketplaceSettingsSection_default.button,
              disabled: already || installing,
              onClick: () => {
                requestInstall(t, entry, props.onInstall);
              },
              children: installing ? t("installing") : t("install")
            }
          ) })
        ] }, entry.name);
      }) }),
      details !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        CatalogDetailsDialog,
        {
          t,
          entry: details,
          already: props.installedNames.has(details.name),
          installing: props.busyName === details.name,
          onClose: () => {
            setDetails(null);
          },
          onInstall: () => {
            requestInstall(t, details, props.onInstall);
          }
        }
      ) : null
    ] }) : null,
    editing !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      DetailsDialog,
      {
        t,
        title: t("editMarket"),
        rows: [],
        onClose: () => {
          setEditing(null);
        },
        actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: MarketplaceSettingsSection_default.button,
            disabled: props.savingUrl || editing.value.trim().length === 0,
            onClick: () => {
              commitUrls(savedUrls().map((url) => url === editing.from ? editing.value : url));
              setEditing(null);
            },
            children: props.savingUrl ? t("catalogSaving") : t("catalogSave")
          }
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: MarketplaceSettingsSection_default.field, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("marketUrl") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              value: editing.value,
              placeholder: t("marketUrl"),
              onChange: (event) => {
                setEditing({ from: editing.from, value: event.currentTarget.value });
              }
            }
          )
        ] })
      }
    ) : null
  ] });
}
function InstalledPage(props) {
  const { t } = props;
  const [details, setDetails] = (0, import_react.useState)(null);
  const [kindFilter, setKindFilter] = (0, import_react.useState)("all");
  const visible = kindFilter === "all" ? props.filtered : props.filtered.filter((entry) => entry.kind === kindFilter);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    props.installed.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.status, children: t("loading") }) : null,
    props.installed.status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.failure, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: t("error") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: MarketplaceSettingsSection_default.button, onClick: props.onRetry, children: t("retry") })
    ] }) : null,
    props.installed.status === "ready" && props.installed.value.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.empty, children: t("installedEmpty") }) : null,
    props.installed.status === "ready" && props.installed.value.length > 0 && visible.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.empty, children: t("emptySearch") }) : null,
    visible.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.headingRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("installedHeading") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: visible.length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: MarketplaceSettingsSection_default.filters, role: "group", "aria-label": t("installedHeading"), children: [
        ["all", t("filterAll")],
        ["inbox", t("filterInbox")],
        ["bundle", t("filterBundle")],
        ["dependency", t("filterDependency")]
      ].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: MarketplaceSettingsSection_default.filter,
          "data-active": kindFilter === id ? "true" : void 0,
          onClick: () => {
            setKindFilter(id);
          },
          children: label
        },
        id
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: `${MarketplaceSettingsSection_default.cards} ${MarketplaceSettingsSection_default.catalogCards}`, children: visible.map((entry) => {
        const busy = props.busyName === entry.packageName;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: `${MarketplaceSettingsSection_default.card} ${MarketplaceSettingsSection_default.catalogCard}`, "data-plugin-name": entry.packageName, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: MarketplaceSettingsSection_default.cardBody, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tooltip, { label: installedHoverLabel(entry.packageName, entry.spec), side: "bottom", maxWidth: 360, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: MarketplaceSettingsSection_default.cardHit,
              "aria-haspopup": "dialog",
              "aria-label": t("openDetailsNamed", { title: entry.packageName }),
              onClick: () => {
                setDetails(entry);
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: MarketplaceSettingsSection_default.tag, children: installedKindLabel(t, entry.kind) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: MarketplaceSettingsSection_default.cardTitle, children: entry.packageName }),
                entry.spec.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.packageName, children: entry.spec }) : null
              ]
            }
          ) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.cardAside, children: [
            entry.canToggle && entry.entryIds[0] !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: MarketplaceSettingsSection_default.button,
                disabled: busy,
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
                disabled: busy,
                onClick: () => {
                  if (globalThis.confirm(t("confirmUninstall"))) props.onUninstall(entry.packageName);
                },
                children: busy ? t("uninstalling") : t("uninstall")
              }
            ) : null
          ] })
        ] }, entry.packageName);
      }) }),
      details !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        InstalledDetailsDialog,
        {
          t,
          entry: details,
          busy: props.busyName === details.packageName,
          onClose: () => {
            setDetails(null);
          },
          onToggle: (entryId) => {
            props.onToggle(entryId, !details.enabled, details.packageName);
          },
          onUninstall: () => {
            if (globalThis.confirm(t("confirmUninstall"))) props.onUninstall(details.packageName);
          }
        }
      ) : null
    ] }) : null
  ] });
}
function DetailsDialog(props) {
  const { t } = props;
  const closeRef = (0, import_react.useRef)(null);
  const onCloseRef = (0, import_react.useRef)(props.onClose);
  onCloseRef.current = props.onClose;
  (0, import_react.useEffect)(() => {
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);
  return (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.dialogRoot, role: "presentation", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: MarketplaceSettingsSection_default.dialogMask, "aria-hidden": "true", onClick: props.onClose }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: MarketplaceSettingsSection_default.dialog,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "marketplace-plugin-details-title",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.dialogHeader, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: MarketplaceSettingsSection_default.dialogTitle, id: "marketplace-plugin-details-title", children: props.title }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                ref: closeRef,
                type: "button",
                className: MarketplaceSettingsSection_default.dialogClose,
                "aria-label": t("closeDetails"),
                onClick: props.onClose,
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", { className: MarketplaceSettingsSection_default.dialogMeta, children: props.rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: row.label }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: row.href !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: row.href, target: "_blank", rel: "noreferrer", children: row.value }) : row.mono === true ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: MarketplaceSettingsSection_default.dialogCode, children: row.value }) : row.value })
          ] }, row.label)) }),
          props.description !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: MarketplaceSettingsSection_default.dialogDescription, children: props.description }) : null,
          props.children,
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: MarketplaceSettingsSection_default.dialogFooter, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: MarketplaceSettingsSection_default.button, onClick: props.onClose, children: t("closeDetails") }),
            props.actions
          ] })
        ]
      }
    )
  ] }), document.body);
}
function CatalogDetailsDialog(props) {
  const { t, entry } = props;
  const rows = [
    { label: t("detailsPackage"), value: catalogPackageLabel(entry.name, entry.version), mono: true },
    { label: t("detailsKind"), value: t(entry.kind === "bundle" ? "bundleTag" : "pluginTag") },
    { label: t("detailsSource"), value: entry.sourceTitle },
    ...entry.homepage.length > 0 ? [{ label: t("detailsHomepage"), value: entry.homepage, href: entry.homepage }] : []
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    DetailsDialog,
    {
      t,
      title: entry.title,
      rows,
      description: entry.description.length > 0 ? entry.description : t("detailsNoDescription"),
      onClose: props.onClose,
      actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: MarketplaceSettingsSection_default.button,
          disabled: props.already || props.installing,
          onClick: props.onInstall,
          children: props.already ? t("installedTag") : props.installing ? t("installing") : t("install")
        }
      )
    }
  );
}
function InstalledDetailsDialog(props) {
  const { t, entry } = props;
  const rows = [
    { label: t("detailsPackage"), value: entry.packageName, mono: true },
    { label: t("detailsKind"), value: installedKindLabel(t, entry.kind) },
    ...entry.spec.length > 0 ? [{ label: t("detailsSpec"), value: entry.spec, mono: true }] : [],
    { label: t("detailsStatus"), value: entry.enabled ? t("enabledTag") : t("disabledTag") },
    ...entry.entryIds.length > 0 ? [{ label: t("detailsEntries"), value: entry.entryIds.join("\n"), mono: true }] : [],
    ...entry.fiberPhase !== null ? [{ label: t("detailsPhase"), value: entry.fiberPhase, mono: true }] : []
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    DetailsDialog,
    {
      t,
      title: entry.packageName,
      rows,
      onClose: props.onClose,
      actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        entry.canToggle && entry.entryIds[0] !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: MarketplaceSettingsSection_default.button,
            disabled: props.busy,
            onClick: () => {
              props.onToggle(entry.entryIds[0]);
            },
            children: entry.enabled ? t("disable") : t("enable")
          }
        ) : null,
        entry.canUninstall ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: MarketplaceSettingsSection_default.button,
            disabled: props.busy,
            onClick: props.onUninstall,
            children: props.busy ? t("uninstalling") : t("uninstall")
          }
        ) : null
      ] })
    }
  );
}
function ConfigurePage(props) {
  const cards = props.renderCards();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: MarketplaceSettingsSection_default.headingRow, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: props.t("cards") }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: MarketplaceSettingsSection_default.configList, children: cards })
  ] });
}

// src/client/command-picker.ts
function reloadPickOptions(targets, allLabel, allDetail) {
  const rows = [{ id: "", label: allLabel, detail: allDetail }];
  for (const target of targets) {
    rows.push({
      id: target.id,
      label: target.id,
      ...target.moduleName.length > 0 && target.moduleName !== target.id ? { detail: target.moduleName } : {}
    });
  }
  return rows;
}
function updatePickOptions(targets, allLabel, allDetail) {
  return [
    { id: "", label: allLabel, detail: allDetail },
    ...targets.map((target) => ({ id: target.name, label: target.name }))
  ];
}
function commandLine(name, plugin) {
  return plugin.length === 0 ? `/${name}` : `/${name} ${plugin}`;
}

// src/client/ReloadCommandCard.tsx
var import_react2 = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/host/reload.ts
function formatReloadFinished(ok, failed) {
  if (failed === 0) return `\u91CD\u8F7D\u5B8C\u6210, \u6210\u529F\u91CD\u8F7D ${String(ok)} \u4E2A\u63D2\u4EF6`;
  return `\u91CD\u8F7D\u5B8C\u6210, \u6210\u529F\u91CD\u8F7D ${String(ok)} \u4E2A\u63D2\u4EF6, \u5931\u8D25 ${String(failed)} \u4E2A`;
}

// src/client/reload-card.ts
function commandBody(text) {
  if (text === void 0) return null;
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return null;
  const body = lines.slice(1).join("\n").replace(/^\n+/, "");
  return body.length > 0 ? body : null;
}
function sameReloadProgress(left, right) {
  if (left === right) return true;
  if (left === void 0 || right === void 0) return false;
  return left.phase === right.phase && left.current === right.current && left.index === right.index && left.total === right.total && left.ok === right.ok && left.failed === right.failed && left.message === right.message;
}
function listedBody(text, names) {
  return commandBody(text) ?? (names.length > 0 ? names.join("\n") : null);
}
function finishedCopy(progress, body) {
  const failed = progress.failed > 0 || progress.message.startsWith("\u540E\u53F0\u91CD\u8F7D\u5931\u8D25");
  return {
    summary: progress.failed > 0 || progress.ok > 0 ? formatReloadFinished(progress.ok, progress.failed) : progress.message.split("\n")[0] ?? formatReloadFinished(0, 1),
    body: body ?? commandBody(progress.message),
    state: failed ? "error" : "ok"
  };
}
var REBOOT_PENDING = "\u6B63\u5728\u91CD\u542F\uFF0C\u9875\u9762\u5373\u5C06\u5237\u65B0";
var REBOOT_DONE = "\u5DF2\u91CD\u542F";
function isRebootPending(text) {
  return text === REBOOT_PENDING || (text?.startsWith("\u6B63\u5728\u91CD\u542F") ?? false);
}
function reloadCardCopy(node, progress, names = [], options = {}) {
  const accepted = node.outcome?.text;
  const body = listedBody(accepted, names);
  if (node.name === "reboot") {
    if (accepted === void 0) return { summary: REBOOT_PENDING, body: null, state: "running" };
    if (node.outcome?.kind === "error") {
      return { summary: accepted.split("\n")[0]?.trimEnd() || "\u91CD\u542F\u5931\u8D25", body: null, state: "error" };
    }
    if (options.rebootSettled === true || !isRebootPending(accepted)) {
      return {
        summary: isRebootPending(accepted) ? REBOOT_DONE : accepted.split("\n")[0]?.trimEnd() || REBOOT_DONE,
        body: null,
        state: "ok"
      };
    }
    return { summary: REBOOT_PENDING, body: null, state: "running" };
  }
  if (accepted !== void 0) {
    const summary = accepted.split("\n")[0]?.trimEnd() || "\u6B63\u5728\u91CD\u8F7D\u63D2\u4EF6";
    const done = summary.startsWith("\u91CD\u8F7D\u5B8C\u6210");
    if (progress?.phase === "done" && !done) return finishedCopy(progress, body);
    return { summary, body, state: done ? "ok" : "running" };
  }
  if (progress?.phase === "done") return finishedCopy(progress, body);
  return {
    summary: progress !== void 0 && progress.total > 0 ? `\u6B63\u5728\u91CD\u8F7D ${String(progress.total)} \u4E2A\u63D2\u4EF6` : "\u6B63\u5728\u91CD\u8F7D\u63D2\u4EF6",
    body,
    state: "running"
  };
}

// src/client/ReloadCommandCard.module.css
var css2 = "._998sQa_root{flex-direction:column;display:flex}._998sQa_row{position:relative;overflow:hidden}._998sQa_leading{flex-shrink:0}._998sQa_chevron{color:var(--dsw-alias-label-secondary)}._998sQa_title{font-weight:400}._998sQa_separator{background:var(--dsw-alias-label-caption);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}._998sQa_summary{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:auto;font-size:14px;line-height:24px;overflow:hidden}._998sQa_summary[data-error],._998sQa_body[data-error]{color:var(--dsw-alias-state-error-primary)}._998sQa_body{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-markdown-code-block);max-height:260px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-markdown-code-block-small);white-space:pre-wrap;border-radius:12px;margin:4px 0 4px 4px;padding:12px 16px;overflow:auto}";
var tagId2 = "plugin-marketplace/ReloadCommandCard.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId2) + "]") === null) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "@starpivot/dsh-plugin-marketplace";
  tag.dataset.pluginCss = tagId2;
  tag.textContent = css2;
  document.head.appendChild(tag);
}
var ReloadCommandCard_default = { "summary": "_998sQa_summary", "root": "_998sQa_root", "title": "_998sQa_title", "chevron": "_998sQa_chevron", "leading": "_998sQa_leading", "body": "_998sQa_body", "separator": "_998sQa_separator", "row": "_998sQa_row" };

// src/client/ReloadCommandCard.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function leadingFor(state) {
  return state === "error" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.StateDot, { state: "error" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconApiOutline14, { size: 14 });
}
function useReloadSnapshot(progress, names, rebootSettled, source) {
  let cached = {
    progress: source?.get() ?? progress,
    names: source?.names?.() ?? names ?? [],
    rebootSettled: source?.rebootSettled?.() ?? rebootSettled === true
  };
  return (0, import_react2.useSyncExternalStore)(
    (listener) => source?.subscribe(listener) ?? (() => {
    }),
    () => {
      const next = {
        progress: source?.get() ?? progress,
        names: source?.names?.() ?? names ?? [],
        rebootSettled: source?.rebootSettled?.() ?? rebootSettled === true
      };
      if (sameReloadProgress(cached.progress, next.progress) && cached.names.join("\0") === next.names.join("\0") && cached.rebootSettled === next.rebootSettled) return cached;
      cached = next;
      return next;
    },
    () => ({ progress, names: names ?? [], rebootSettled: rebootSettled === true })
  );
}
function ReloadCommandCard({
  node,
  progress,
  names,
  rebootSettled,
  progressSource
}) {
  const [expanded, setExpanded] = (0, import_react2.useState)(false);
  const live = useReloadSnapshot(progress, names, rebootSettled, progressSource);
  const { summary, body, state } = reloadCardCopy(node, live.progress, live.names, {
    rebootSettled: live.rebootSettled
  });
  const open = expanded && body !== null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: ReloadCommandCard_default.root, "data-variant": "others", "data-state": state, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    import_dsh_client_ui_primitives2.DisclosureRow,
    {
      rowClassName: ReloadCommandCard_default.row,
      leadingClassName: ReloadCommandCard_default.leading,
      titleClassName: ReloadCommandCard_default.title,
      chevronClassName: ReloadCommandCard_default.chevron,
      icon: leadingFor(state),
      title: node.name ?? "reload",
      open,
      expandable: body !== null,
      expandOnRowClick: true,
      keepContentWhenOpen: true,
      onToggle: () => {
        setExpanded((value) => !value);
      },
      collapsedContent: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: ReloadCommandCard_default.separator, "aria-hidden": true }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: ReloadCommandCard_default.summary, "data-error": state === "error" || void 0, children: summary })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("pre", { className: ReloadCommandCard_default.body, "data-error": state === "error" || void 0, children: body })
    }
  ) });
}

// src/client/ReloadProgressToast.tsx
var import_react3 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
function ReloadProgressToast(props) {
  const progress = props.progress;
  const [visible, setVisible] = (0, import_react3.useState)(false);
  (0, import_react3.useEffect)(() => {
    if (progress === void 0 || progress.phase === "idle" || props.live !== true) {
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
  }, [progress?.phase, progress?.index, progress?.message, props.live]);
  if (!visible || progress === void 0 || progress.phase === "idle") return null;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: MarketplaceSettingsSection_default.reloadToast, role: "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: progress.phase === "done" ? props.t("reloadDone") : props.t("reloadProgress") }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: progress.message || progress.current })
  ] });
}

// src/client/reload-page.ts
var MARKETPLACE_CLIENT_PACKAGE = "@starpivot/dsh-plugin-marketplace";
var CLIENT_SKELETON_PACKAGES = /* @__PURE__ */ new Set([
  "@deepseek-ai/dsh-client-connection",
  "@deepseek-ai/dsh-client-modules",
  "@deepseek-ai/dsh-client-runtime",
  "@deepseek-ai/dsh-client-hmr",
  "@deepseek-ai/dsh-api-remotes",
  "@deepseek-ai/dsh-cordis-client-runner",
  "@deepseek-ai/dsh-api-gateway",
  "@deepseek-ai/dsh-typert-registry",
  "@deepseek-ai/dsh-client-ui-theme",
  "@deepseek-ai/dsh-client-locale",
  "@deepseek-ai/dsh-client-ui-layout",
  "@deepseek-ai/dsh-client-ui-sidebar",
  "@deepseek-ai/dsh-client-ui-settings"
]);
function findClientEntry(loader, packageName) {
  for (const entry of loader.entries()) {
    if (entry.options.name === packageName) return entry;
  }
  return void 0;
}
function selectPageReloadIds(requested) {
  const overlay = [];
  const marketplace = [];
  const seen = /* @__PURE__ */ new Set();
  for (const id of requested) {
    if (seen.has(id) || CLIENT_SKELETON_PACKAGES.has(id)) continue;
    seen.add(id);
    if (id === MARKETPLACE_CLIENT_PACKAGE) marketplace.push(id);
    else overlay.push(id);
  }
  return [...overlay, ...marketplace];
}
function removeOwnedStyles(id) {
  if (typeof document === "undefined") return;
  for (const el of document.querySelectorAll("style[data-plugin]")) {
    if (el.getAttribute("data-plugin") === id) el.remove();
  }
}
async function reloadClientPlugin(host, packageName) {
  const loader = host.loader;
  const modules = host.modules;
  if (loader === void 0 || modules === void 0) return "skipped";
  if (CLIENT_SKELETON_PACKAGES.has(packageName)) return "skipped";
  const entry = findClientEntry(loader, packageName);
  if (entry === void 0) return "skipped";
  modules.invalidate(packageName);
  await modules.prefetch(packageName);
  const oldFiber = entry.fiber;
  if (oldFiber !== void 0) {
    const runtime = oldFiber.runtime;
    if (runtime != null) entry.ctx.registry.delete(runtime.callback);
    while (oldFiber.inertia !== void 0) await oldFiber.inertia;
    delete entry.fiber;
  }
  ;
  (host.removeOwnedStyles ?? removeOwnedStyles)(packageName);
  await entry.refresh();
  await entry.fiber?.await?.();
  return "reloaded";
}
async function reloadMarketplacePage(host, requested = [MARKETPLACE_CLIENT_PACKAGE]) {
  const ids = selectPageReloadIds(requested.length > 0 ? requested : [MARKETPLACE_CLIENT_PACKAGE]);
  let reloaded = false;
  for (const id of ids) {
    if (await reloadClientPlugin(host, id) === "reloaded") reloaded = true;
  }
  return reloaded ? "reloaded" : "skipped";
}

// src/client/reload-status.ts
function asReloadStatus(value) {
  if (value === null || typeof value !== "object") return void 0;
  const row = value;
  if (row.phase !== "idle" && row.phase !== "running" && row.phase !== "done") return void 0;
  return {
    phase: row.phase,
    current: typeof row.current === "string" ? row.current : "",
    index: typeof row.index === "number" ? row.index : 0,
    total: typeof row.total === "number" ? row.total : 0,
    ok: typeof row.ok === "number" ? row.ok : 0,
    failed: typeof row.failed === "number" ? row.failed : 0,
    message: typeof row.message === "string" ? row.message : "",
    nonce: typeof row.nonce === "number" ? row.nonce : 0,
    clientIds: Array.isArray(row.clientIds) ? row.clientIds.filter((id) => typeof id === "string") : [],
    names: Array.isArray(row.names) ? row.names.filter((id) => typeof id === "string") : [],
    rebootNonce: typeof row.rebootNonce === "number" ? row.rebootNonce : 0
  };
}
function progressFromStatus(status) {
  if (status === void 0) return void 0;
  return {
    phase: status.phase,
    current: status.current,
    index: status.index,
    total: status.total,
    ok: status.ok,
    failed: status.failed,
    message: status.message
  };
}
function hostGenerationAfterLoss(state) {
  let seenHost = state.seenHost;
  let lostHost = state.lostHost;
  if (seenHost && !state.up) lostHost = true;
  if (state.up) seenHost = true;
  const reload = lostHost && state.up;
  if (reload) lostHost = false;
  return { seenHost, lostHost, reload };
}
function sameReloadStatus(left, right) {
  if (left === right) return true;
  if (left === void 0 || right === void 0) return false;
  return left.phase === right.phase && left.current === right.current && left.index === right.index && left.total === right.total && left.ok === right.ok && left.failed === right.failed && left.message === right.message && left.nonce === right.nonce && left.clientIds.join("\0") === right.clientIds.join("\0") && left.names.join("\0") === right.names.join("\0") && left.rebootNonce === right.rebootNonce;
}

// src/client/locales.ts
var zh = {
  nav: "\u63D2\u4EF6",
  title: "\u63D2\u4EF6\u5E02\u573A",
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
  addMarket: "\u6DFB\u52A0\u5E02\u573A",
  editMarket: "\u7F16\u8F91",
  removeMarket: "\u79FB\u9664",
  confirmRemoveMarket: "\u79FB\u9664\u8FD9\u4E2A\u8FDC\u7A0B\u5E02\u573A\uFF1F",
  catalogSave: "\u4FDD\u5B58\u5E02\u573A",
  catalogSaving: "\u4FDD\u5B58\u4E2D\u2026",
  refreshCatalog: "\u62C9\u53D6\u5168\u90E8",
  refreshingCatalog: "\u62C9\u53D6\u4E2D\u2026",
  refreshMarket: "\u62C9\u53D6\u6B64\u6E90",
  marketFailed: "\u65E0\u6CD5\u8BFB\u53D6",
  install: "\u5B89\u88C5",
  installing: "\u5B89\u88C5\u4E2D\u2026",
  installedTag: "\u5DF2\u5B89\u88C5",
  restart: "\u5DF2\u5199\u5165 profile\u3002\u91CD\u542F dsh web \u540E\u65B0\u63D2\u4EF6\u624D\u4F1A\u51FA\u73B0\u3002",
  installedHeading: "\u672C profile \u7684\u63D2\u4EF6",
  installedEmpty: "\u8FD9\u4E2A profile \u8FD8\u6CA1\u6709\u989D\u5916\u63D2\u4EF6\u3002",
  filterAll: "\u5168\u90E8",
  filterInbox: "\u968F\u5B89\u88C5\u5185\u7F6E",
  filterBundle: "\u7EC4\u5408\u5305",
  filterDependency: "\u4F9D\u8D56",
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
  openDetailsNamed: "\u67E5\u770B {title} \u7684\u5B8C\u6574\u4FE1\u606F",
  closeDetails: "\u5173\u95ED",
  detailsPackage: "\u5305\u540D",
  detailsKind: "\u7C7B\u578B",
  detailsSource: "\u6765\u6E90",
  detailsHomepage: "\u4E3B\u9875",
  detailsSpec: "\u89C4\u683C",
  detailsStatus: "\u72B6\u6001",
  detailsEntries: "\u6761\u76EE",
  detailsPhase: "\u9636\u6BB5",
  detailsNoDescription: "\u8FD9\u4E2A\u63D2\u4EF6\u6CA1\u6709\u63CF\u8FF0\u3002",
  enabledTag: "\u5DF2\u542F\u7528",
  disabledTag: "\u5DF2\u505C\u7528",
  pluginTag: "\u63D2\u4EF6",
  cards: "\u53EF\u914D\u7F6E\u63D2\u4EF6",
  configureEmpty: "\u8FD9\u4E2A\u90E8\u7F72\u6CA1\u6709\u53EF\u914D\u7F6E\u7684\u63D2\u4EF6\u3002",
  reloadProgress: "\u6B63\u5728\u91CD\u8F7D\u63D2\u4EF6",
  reloadDone: "\u91CD\u8F7D\u5B8C\u6210",
  reloadAll: "\u5168\u90E8\u53EF\u91CD\u8F7D\u63D2\u4EF6",
  reloadAllDetail: "\u4E0D\u5199\u540D\u5B57\u5219\u91CD\u8F7D\u5168\u90E8",
  updateAll: "\u5168\u90E8\u4F9D\u8D56",
  updateAllDetail: "\u4E0D\u5199\u540D\u5B57\u5219\u66F4\u65B0\u5168\u90E8"
};
var en = {
  nav: "Plugins",
  title: "Plugin marketplace",
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
  addMarket: "Add marketplace",
  editMarket: "Edit",
  removeMarket: "Remove",
  confirmRemoveMarket: "Remove this remote marketplace?",
  catalogSave: "Save marketplaces",
  catalogSaving: "Saving\u2026",
  refreshCatalog: "Fetch all",
  refreshingCatalog: "Fetching\u2026",
  refreshMarket: "Fetch this source",
  marketFailed: "Unavailable",
  install: "Install",
  installing: "Installing\u2026",
  installedTag: "Installed",
  restart: "Written to the profile. Restart dsh web before new plugins appear.",
  installedHeading: "Plugins in this profile",
  installedEmpty: "This profile has no extra plugins.",
  filterAll: "All",
  filterInbox: "In-box",
  filterBundle: "Bundle",
  filterDependency: "Dependency",
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
  openDetailsNamed: "View full details for {title}",
  closeDetails: "Close",
  detailsPackage: "Package",
  detailsKind: "Kind",
  detailsSource: "Source",
  detailsHomepage: "Homepage",
  detailsSpec: "Spec",
  detailsStatus: "Status",
  detailsEntries: "Entries",
  detailsPhase: "Phase",
  detailsNoDescription: "This plugin has no description.",
  enabledTag: "Enabled",
  disabledTag: "Disabled",
  pluginTag: "Plugin",
  cards: "Configurable plugins",
  configureEmpty: "This deployment exposes no plugin settings.",
  reloadProgress: "Reloading plugins",
  reloadDone: "Reload finished",
  reloadAll: "All reloadable plugins",
  reloadAllDetail: "Leave the name blank to reload everything allowed",
  updateAll: "All dependencies",
  updateAllDetail: "Leave the name blank to update every profile dependency"
};

// src/client/index.ts
var NS = "settings.pluginMarketplace";
var inject = ["slots", "locale", "settingsScope", "connection", "loader", "modules", "commandUi", "sessions"];
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
  const host = document.createElement("div");
  host.dataset.pluginMarketplaceReload = "true";
  document.body.append(host);
  const root = (0, import_client.createRoot)(host);
  let reloadStatus;
  let lastNonce;
  let lastRebootNonce;
  let toastLive = false;
  let rebootSettled = sessionStorage.getItem("dsh-marketplace-rebooted") === "1";
  let pageReload = Promise.resolve();
  const listeners = /* @__PURE__ */ new Set();
  const renderToast = () => {
    root.render((0, import_react4.createElement)(ReloadProgressToast, {
      progress: progressFromStatus(reloadStatus),
      live: toastLive,
      t
    }));
  };
  const adoptStatus = (next, triggerPageReload) => {
    if (sameReloadStatus(reloadStatus, next)) return;
    const previous = reloadStatus;
    reloadStatus = next;
    if (lastNonce !== void 0 && next !== void 0 && (next.phase === "running" || next.phase === "done" && previous?.phase === "running")) {
      toastLive = true;
    }
    for (const listener of listeners) listener();
    renderToast();
    const nonce = next?.nonce ?? 0;
    const rebootNonce = next?.rebootNonce ?? 0;
    if (lastNonce === void 0) lastNonce = nonce;
    if (lastRebootNonce === void 0) lastRebootNonce = rebootNonce;
    if (triggerPageReload && rebootNonce > lastRebootNonce) {
      lastRebootNonce = rebootNonce;
      lastNonce = nonce;
      sessionStorage.setItem("dsh-marketplace-rebooted", "1");
      window.location.reload();
      return;
    }
    if (!triggerPageReload || nonce <= lastNonce || next === void 0) return;
    lastNonce = nonce;
    pageReload = pageReload.then(() => reloadMarketplacePage({
      loader: ctx.get("loader"),
      modules: ctx.get("modules")
    }, next.clientIds)).catch((error) => {
      console.error("plugin-marketplace: page reload failed", error);
    });
  };
  const pollReload = async () => {
    try {
      adoptStatus(asReloadStatus(await callMarketplace("reloadStatus")), true);
    } catch {
    }
  };
  const connection = ctx.get("connection");
  const hostDescription = connection.hostDescription;
  if (hostDescription !== void 0) {
    let generation = {
      seenHost: hostDescription.getSnapshot() !== void 0,
      lostHost: false
    };
    if (rebootSettled) sessionStorage.removeItem("dsh-marketplace-rebooted");
    const offHost = hostDescription.subscribe(() => {
      generation = hostGenerationAfterLoss({
        ...generation,
        up: hostDescription.getSnapshot() !== void 0
      });
      if (!generation.reload) return;
      sessionStorage.setItem("dsh-marketplace-rebooted", "1");
      window.location.reload();
    });
    ctx.effect(() => () => {
      offHost();
    }, "plugin-marketplace: reboot page refresh");
  }
  renderToast();
  void pollReload();
  const timer = window.setInterval(() => {
    void pollReload();
  }, 400);
  ctx.effect(() => () => {
    window.clearInterval(timer);
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
    refreshCatalog: (url) => callMarketplace("refreshCatalog", url === void 0 ? {} : { url }),
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
  const commandCard = (props) => (0, import_react4.createElement)(ReloadCommandCard, {
    node: props.node,
    progress: progressFromStatus(reloadStatus),
    names: reloadStatus?.names ?? [],
    rebootSettled,
    progressSource: {
      get: () => progressFromStatus(reloadStatus),
      names: () => reloadStatus?.names ?? [],
      rebootSettled: () => rebootSettled,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }
    }
  });
  ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
    name: "conversation.chat.commandview",
    key: "reload",
    locale: NS
  }, commandCard));
  ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
    name: "conversation.chat.commandview",
    key: "reboot",
    locale: NS
  }, commandCard));
  const command = ctx.get("commandUi");
  const sessions = ctx.get("sessions");
  if (command !== void 0 && sessions !== void 0) {
    const decorateNamed = (name) => {
      ctx.effect(() => command.decorate({
        name,
        available: () => true,
        ui: {
          kind: "popupSelect",
          options: async () => {
            const targets = await callMarketplace("listCommandTargets");
            return name === "reload" ? reloadPickOptions(targets.reload, t("reloadAll"), t("reloadAllDetail")) : updatePickOptions(targets.update, t("updateAll"), t("updateAllDetail"));
          },
          onSelect: async (option, session) => {
            const live = sessions.get(session.sessionId);
            const result = await live.command(commandLine(name, option.id));
            if (!result.ok) throw new Error(`pluginMarketplace.${name} failed: ${result.error.message}`);
            if (!result.value.matched) throw new Error(`the host offers no /${name} command`);
          }
        }
      }), `plugin-marketplace: /${name} picker`);
    };
    decorateNamed("reload");
    decorateNamed("update");
  }
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
