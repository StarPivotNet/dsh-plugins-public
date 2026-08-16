// src/host/index.ts
import {
  packageExportsBundle,
  readProfileManifest as readProfileManifest2,
  readProfilePatches,
  reconcileProfilePlugins as reconcileProfilePlugins2,
  runProfilePnpm as runProfilePnpm2,
  writeProfilePatches
} from "@deepseek-ai/dsh-app-boot";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";

// src/host/names.ts
var PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
var VERSION = /^(?:[0-9]+(?:\.[0-9A-Za-z-]+)*(?:[+.][0-9A-Za-z.-]+)*|[A-Za-z][0-9A-Za-z._-]*)$/;
function isRegistryPackageName(name2) {
  return PACKAGE_NAME.test(name2) && !name2.includes("..") && !name2.startsWith(".") && !name2.includes(":");
}
function isInstallVersion(version) {
  return VERSION.test(version) && !version.includes("/") && !version.includes(":");
}
function installSpec(name2, version) {
  return version === void 0 || version.length === 0 ? name2 : `${name2}@${version}`;
}

// src/host/catalog.ts
var MAX_CATALOG_BYTES = 256 * 1024;
var KINDS = /* @__PURE__ */ new Set(["bundle", "plugin"]);
function parseCatalogDocument(raw, sourceUrl) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: "catalog root must be an object" };
  }
  const document = raw;
  if (document.version !== 1) return { ok: false, message: "catalog version must be 1" };
  if (!Array.isArray(document.plugins)) return { ok: false, message: "catalog plugins must be an array" };
  const title = typeof document.title === "string" && document.title.trim().length > 0 ? document.title.trim() : typeof document.name === "string" && document.name.trim().length > 0 ? document.name.trim() : sourceTitleFromUrl(sourceUrl);
  const entries = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [index, item] of document.plugins.entries()) {
    const parsed = parseListing(item, index);
    if (!parsed.ok) return parsed;
    if (seen.has(parsed.entry.name)) {
      return { ok: false, message: `catalog lists ${parsed.entry.name} more than once` };
    }
    seen.add(parsed.entry.name);
    entries.push(parsed.entry);
  }
  return { ok: true, title, entries };
}
function parseListing(item, index) {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    return { ok: false, message: `catalog plugins[${String(index)}] must be an object` };
  }
  const row = item;
  if (typeof row.name !== "string" || !isRegistryPackageName(row.name)) {
    return { ok: false, message: `catalog plugins[${String(index)}] has an invalid name` };
  }
  const version = row.version === void 0 ? "" : row.version;
  if (typeof version !== "string" || version.length > 0 && !isInstallVersion(version)) {
    return { ok: false, message: `catalog plugins[${String(index)}] has an invalid version` };
  }
  if (typeof row.title !== "string" || row.title.trim().length === 0) {
    return { ok: false, message: `catalog plugins[${String(index)}] needs a title` };
  }
  if (typeof row.description !== "string") {
    return { ok: false, message: `catalog plugins[${String(index)}] needs a description` };
  }
  const homepage = row.homepage === void 0 ? "" : row.homepage;
  if (typeof homepage !== "string") {
    return { ok: false, message: `catalog plugins[${String(index)}] homepage must be a string` };
  }
  if (homepage.length > 0) {
    let url;
    try {
      url = new URL(homepage);
    } catch {
      return { ok: false, message: `catalog plugins[${String(index)}] homepage is not a URL` };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, message: `catalog plugins[${String(index)}] homepage must be http(s)` };
    }
  }
  if (typeof row.kind !== "string" || !KINDS.has(row.kind)) {
    return { ok: false, message: `catalog plugins[${String(index)}] kind must be bundle or plugin` };
  }
  return {
    ok: true,
    entry: {
      name: row.name,
      version,
      title: row.title.trim(),
      description: row.description,
      homepage,
      kind: row.kind
    }
  };
}
function isCatalogUrl(catalogUrl) {
  if (catalogUrl.length === 0) return true;
  try {
    const url = new URL(catalogUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function sourceTitleFromUrl(catalogUrl) {
  try {
    return new URL(catalogUrl).host;
  } catch {
    return catalogUrl;
  }
}
function normalizeCatalogUrls(raw, fallback = "") {
  const collected = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") collected.push(item);
    }
  } else if (typeof raw === "string") {
    collected.push(...raw.split(/[\n,]/));
  }
  if (fallback.length > 0) collected.push(...fallback.split(/[\n,]/));
  const seen = /* @__PURE__ */ new Set();
  const urls = [];
  for (const item of collected) {
    const url = item.trim();
    if (url.length === 0 || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}
function emptyCatalog() {
  return { configured: false, sources: [], entries: [] };
}

// src/host/commands.ts
import { fileURLToPath } from "node:url";
import { dirname, join as join2 } from "node:path";
import {
  readProfileManifest,
  reconcileProfilePlugins,
  runProfilePnpm
} from "@deepseek-ai/dsh-app-boot";

// src/host/reload.ts
var SKELETON_LEAF_IDS = /* @__PURE__ */ new Set([
  "webserver",
  "connection",
  "client-hmr",
  "modules",
  "api-gateway",
  "api-remotes",
  "web-startup",
  "web-runtime",
  "client-runtime",
  "cordis-host-runner",
  "cordis-client-runner",
  "commands",
  "settings",
  "session",
  "agent",
  "agent-loop",
  "llm",
  "typert",
  "typert-loader",
  "typert-gateway",
  "storage",
  "storage-json",
  "storage-domain",
  "session-persistence-jsonl",
  "include",
  "timer",
  "hmr"
]);
function packageNameOf(moduleName) {
  if (moduleName.startsWith("@")) {
    const parts = moduleName.split("/");
    return parts.slice(0, 2).join("/");
  }
  return moduleName.split("/")[0] ?? moduleName;
}
function leafEntryId(id) {
  const parts = id.split(":");
  return parts[parts.length - 1] ?? id;
}
function isMarketplaceEntry(id, moduleName) {
  return packageNameOf(moduleName) === "@starpivot/dsh-plugin-marketplace" || leafEntryId(id) === "plugin-marketplace" || leafEntryId(id) === "ui-settings-plugin-marketplace";
}
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
function isClientSkeletonPackage(packageName) {
  return CLIENT_SKELETON_PACKAGES.has(packageName);
}
function isMarketplaceClientPackage(packageName) {
  return packageName === "@starpivot/dsh-plugin-marketplace";
}
function matchesReloadQuery(packageName, matched) {
  const leaf = leafEntryId(matched.id);
  return packageName === packageNameOf(matched.moduleName) || packageName === matched.moduleName || packageName === matched.id || leafEntryId(packageName) === leaf;
}
function selectClientReloadIds(clientIds, matched) {
  const overlay = [];
  const marketplace = [];
  for (const id of clientIds) {
    if (isClientSkeletonPackage(id)) continue;
    if (isMarketplaceClientPackage(id)) marketplace.push(id);
    else overlay.push(id);
  }
  const ordered = [...overlay, ...marketplace];
  if (matched.kind === "all") return marketplace;
  return ordered.filter((id) => matchesReloadQuery(id, matched.entry));
}
function isIncludeContainer(id) {
  return /^include:[^:]+$/.test(id);
}
function isSkeletonEntry(id, moduleName) {
  if (isMarketplaceEntry(id, moduleName)) return false;
  return isIncludeContainer(id) || SKELETON_LEAF_IDS.has(leafEntryId(id));
}
function partitionReloadEntries(entries) {
  const others = [];
  const marketplace = [];
  for (const entry of entries) {
    if (isMarketplaceEntry(entry.id, entry.moduleName)) marketplace.push(entry);
    else others.push(entry);
  }
  return { others, marketplace };
}
function snapshotFromSettings(section) {
  const progress = section?.reloadProgress;
  const phase = progress?.phase === "running" || progress?.phase === "done" ? progress.phase : "idle";
  return {
    phase,
    current: typeof progress?.current === "string" ? progress.current : "",
    index: typeof progress?.index === "number" ? progress.index : 0,
    total: typeof progress?.total === "number" ? progress.total : 0,
    ok: typeof progress?.ok === "number" ? progress.ok : 0,
    failed: typeof progress?.failed === "number" ? progress.failed : 0,
    message: typeof progress?.message === "string" ? progress.message : "",
    nonce: typeof section?.reloadNonce === "number" ? section.reloadNonce : 0,
    clientIds: Array.isArray(section?.reloadClientIds) ? section.reloadClientIds.filter((id) => typeof id === "string") : [],
    names: Array.isArray(section?.reloadNames) ? section.reloadNames.filter((id) => typeof id === "string") : [],
    rebootNonce: typeof section?.rebootNonce === "number" ? section.rebootNonce : 0
  };
}
function normalizeQuery(raw) {
  return raw.trim().toLocaleLowerCase();
}
function matchReloadTarget(entries, rawInput) {
  const query = normalizeQuery(rawInput);
  if (query.length === 0) return { kind: "all" };
  const exact = entries.filter((entry) => entry.id.toLocaleLowerCase() === query || entry.moduleName.toLocaleLowerCase() === query);
  if (exact.length === 1) return { kind: "one", entry: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", query: rawInput.trim(), matches: exact };
  const suggestions = entries.filter((entry) => entry.id.toLocaleLowerCase().includes(query) || entry.moduleName.toLocaleLowerCase().includes(query)).slice(0, 8).map((entry) => entry.id);
  return { kind: "none", query: rawInput.trim(), suggestions };
}
function formatReloadAccepted(entries, clientIds = []) {
  const names = entries.map((entry) => entry.id);
  for (const id of clientIds) {
    const already = entries.some((entry) => entry.id === id || packageNameOf(entry.moduleName ?? "") === id || leafEntryId(entry.id) === leafEntryId(id));
    if (!already) names.push(id);
  }
  if (names.length === 0) return "\u6CA1\u6709\u53EF\u70ED\u91CD\u8F7D\u7684\u63D2\u4EF6\u3002\u8FDE\u63A5\u9AA8\u67B6\u8BF7\u7528 /reboot\u3002";
  return [
    `\u6B63\u5728\u91CD\u8F7D ${String(names.length)} \u4E2A\u63D2\u4EF6`,
    "",
    ...names
  ].join("\n");
}
function formatReloadFinished(ok, failed) {
  if (failed === 0) return `\u91CD\u8F7D\u5B8C\u6210, \u6210\u529F\u91CD\u8F7D ${String(ok)} \u4E2A\u63D2\u4EF6`;
  return `\u91CD\u8F7D\u5B8C\u6210, \u6210\u529F\u91CD\u8F7D ${String(ok)} \u4E2A\u63D2\u4EF6, \u5931\u8D25 ${String(failed)} \u4E2A`;
}
function formatReloadOutcome(summary, names) {
  if (names.length === 0) return summary;
  return [summary, "", ...names].join("\n");
}
function selectReloadEntries(entries, matched) {
  if (matched.kind === "one") {
    const entry = entries.find((item) => item.id === matched.entry.id);
    if (entry === void 0) return { ok: false, message: `\u6CA1\u6709\u5339\u914D ${JSON.stringify(matched.entry.id)} \u7684\u63D2\u4EF6\u3002` };
    if (isSkeletonEntry(entry.id, entry.moduleName)) {
      return { ok: false, message: `${entry.id} \u7EF4\u6301\u5F53\u524D\u8FDE\u63A5\uFF0C\u4E0D\u80FD\u70ED\u91CD\u8F7D\u3002\u8BF7\u8FD0\u884C /reboot\u3002` };
    }
    return { ok: true, selected: [entry], skipped: 0 };
  }
  const selected = entries.filter((entry) => entry.enabled && !isSkeletonEntry(entry.id, entry.moduleName));
  return { ok: true, selected, skipped: entries.filter((entry) => entry.enabled).length - selected.length };
}
async function reloadHostEntry(entry) {
  if (!entry.enabled) return { ok: false, message: `\u6761\u76EE ${entry.id} \u5DF2\u505C\u7528` };
  try {
    if (entry.reload !== void 0) {
      await entry.reload();
      return { ok: true };
    }
    const fiber = entry.fiber;
    if (fiber !== void 0) {
      entry.fiber = void 0;
      await fiber.dispose();
      while (fiber.inertia !== void 0) await fiber.inertia;
    }
    await entry.refresh();
    await entry.fiber?.await();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
async function requestBrowserReload(settings, ns, clientIds = [], names = []) {
  if (settings?.update === void 0) return "\u672A\u80FD\u8BF7\u6C42\u6D4F\u89C8\u5668\u91CD\u8F7D\uFF08settings \u4E0D\u53EF\u7528\uFF09";
  const current = settings.get?.(ns);
  await settings.update(ns, {
    reloadNonce: (current?.reloadNonce ?? 0) + 1,
    reloadClientIds: [...clientIds],
    reloadNames: names.length > 0 ? [...names] : [...current?.reloadNames ?? []]
  });
  return clientIds.length === 0 ? "\u5DF2\u8BF7\u6C42\u6D4F\u89C8\u5668\u91CD\u8F7D\u63D2\u4EF6\u5E02\u573A\u9875\u9762" : `\u5DF2\u8BF7\u6C42\u6D4F\u89C8\u5668\u91CD\u8F7D ${String(clientIds.length)} \u4E2A\u754C\u9762\u63D2\u4EF6`;
}
async function requestBrowserReboot(settings, ns) {
  const next = (settings?.get?.(ns)?.rebootNonce ?? 0) + 1;
  await settings?.update?.(ns, { rebootNonce: next });
  return next;
}

// src/host/update.ts
function resolveUpdateTarget(dependencies, rawInput) {
  const query = rawInput.trim().toLocaleLowerCase();
  if (query.length === 0) return { kind: "all" };
  const exact = dependencies.filter((name2) => name2.toLocaleLowerCase() === query);
  if (exact.length === 1) return { kind: "one", name: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", matches: exact };
  return { kind: "none", query: rawInput.trim() };
}

// src/host/reboot.ts
import { spawn } from "node:child_process";
import { chmodSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
var REBOOT_ENV = "DSH_MARKETPLACE_REBOOT";
function rebootBlocked(_now = Date.now(), _env = process.env) {
  return void 0;
}
function argvWithPort(argv, port) {
  const next = [...argv];
  if (port === void 0) return next;
  const flag = next.findIndex((arg) => arg === "--port" || arg.startsWith("--port="));
  if (flag === -1) return [...next, "--port", String(port)];
  if (next[flag] === "--port") {
    if (next[flag + 1] !== void 0 && !next[flag + 1].startsWith("-")) {
      next[flag + 1] = String(port);
      return next;
    }
    next.splice(flag + 1, 0, String(port));
    return next;
  }
  next[flag] = `--port=${String(port)}`;
  return next;
}
function buildRebootSpec(options) {
  const now = options.now ?? Date.now();
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== void 0) env[key] = value;
  }
  env[REBOOT_ENV] = String(now);
  return {
    parentPid: process.pid,
    execPath: process.execPath,
    execArgv: [...process.execArgv],
    argv: argvWithPort(process.argv.slice(1), options.port),
    cwd: process.cwd(),
    env,
    ...options.port !== void 0 ? { healthUrl: `http://127.0.0.1:${String(options.port)}/` } : {},
    parentTimeoutMs: 3e4,
    childTimeoutMs: 3e4
  };
}
function writeRebootSpec(spec) {
  const path = join(tmpdir(), `dsh-marketplace-reboot-${String(spec.parentPid)}-${spec.env[REBOOT_ENV]}.json`);
  writeFileSync(path, `${JSON.stringify(spec)}
`, { encoding: "utf8", mode: 384 });
  chmodSync(path, 384);
  return path;
}
function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function waitUntil(check, timeoutMs, intervalMs = 200) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return check();
}
async function startWatchdog(watchdogPath, specPath) {
  const child = spawn(process.execPath, [watchdogPath, specPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: false
  });
  if (child.pid === void 0) {
    return { ok: false, message: "\u65E0\u6CD5\u62C9\u8D77\u91CD\u542F\u770B\u95E8\u72D7" };
  }
  child.unref();
  const alive = await waitUntil(() => processAlive(child.pid), 2e3);
  if (!alive) return { ok: false, message: "\u770B\u95E8\u72D7\u5728\u4EA4\u63A5\u524D\u5C31\u9000\u51FA\u4E86" };
  return { ok: true, pid: child.pid };
}

// src/host/commands.ts
function registerMarketplaceCommands(ctx, options) {
  ctx.commands.register({
    name: "reload",
    description: "\u91CD\u8F7D\u63D2\u4EF6\u3002\u4E0D\u5199\u540D\u5B57\u5219\u91CD\u8F7D\u9664\u8FDE\u63A5\u9AA8\u67B6\u5916\u7684\u5168\u90E8\u63D2\u4EF6\u3002",
    input: { hint: "[\u63D2\u4EF6\u540D\u5B57]" },
    handler: (invocation) => handleReload(ctx, options, invocation.rawInput)
  });
  ctx.commands.register({
    name: "update",
    description: "\u66F4\u65B0\u5DF2\u5B89\u88C5\u7684 profile \u63D2\u4EF6\uFF0C\u4E0D\u4F1A\u70ED\u91CD\u8F7D\u3002",
    input: { hint: "[\u63D2\u4EF6\u540D\u5B57]" },
    handler: (invocation) => handleUpdate(options.requireProfile(), invocation.rawInput)
  });
  ctx.commands.register({
    name: "reboot",
    description: "\u91CD\u542F dsh \u8FDB\u7A0B\uFF0C\u9875\u9762\u4F1A\u81EA\u52A8\u5237\u65B0\u3002",
    handler: async () => {
      const blocked = rebootBlocked();
      if (blocked !== void 0) return { kind: "error", text: blocked };
      const spec = buildRebootSpec({ port: options.webPort() });
      const specPath = writeRebootSpec(spec);
      const watchdogPath = join2(dirname(fileURLToPath(import.meta.url)), "reboot-watchdog.js");
      const started = await startWatchdog(watchdogPath, specPath);
      if (!started.ok) return { kind: "error", text: started.message };
      scheduleRebootExit(ctx);
      return { kind: "success", text: "\u6B63\u5728\u91CD\u542F\uFF0C\u9875\u9762\u5373\u5C06\u5237\u65B0" };
    }
  });
}
function scheduleRebootExit(ctx) {
  setTimeout(() => {
    void (async () => {
      const sessions = ctx.get("sessions");
      if (sessions?.list !== void 0 && sessions.flush !== void 0) {
        for (const session of sessions.list()) {
          try {
            await sessions.flush(session);
          } catch {
          }
        }
      }
      process.exit(0);
    })();
  }, 0);
}
async function handleReload(ctx, options, rawInput) {
  const planned = planReload(ctx, rawInput);
  if (planned.kind !== "ok") return planned;
  try {
    return await runReloadQueue(ctx, options, planned.ordered, planned.clientIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "error", text: `\u91CD\u8F7D\u5931\u8D25\uFF1A${message}` };
  }
}
function planReload(ctx, rawInput) {
  const entries = [...ctx.loader.entries()].filter((entry) => !entry.options.group).map((entry) => ({
    id: entry.id,
    moduleName: String(entry.options.name ?? ""),
    enabled: !entry.disabled,
    get fiber() {
      return entry.fiber;
    },
    set fiber(value) {
      entry.fiber = value;
    },
    refresh: () => entry.refresh(),
    reload: async () => {
      await entry._dispose();
      await entry.refresh();
    }
  }));
  const matched = matchReloadTarget(entries, rawInput);
  if (matched.kind === "none") {
    const hint = matched.suggestions.length > 0 ? ` \u662F\u4E0D\u662F\u6307\uFF1A${matched.suggestions.join("\u3001")}` : "";
    return { kind: "error", text: `\u6CA1\u6709\u5339\u914D ${JSON.stringify(matched.query)} \u7684\u63D2\u4EF6\u3002${hint}` };
  }
  if (matched.kind === "ambiguous") {
    return {
      kind: "error",
      text: `\u6709\u591A\u4E2A\u63D2\u4EF6\u5339\u914D ${JSON.stringify(matched.query)}\uFF1A${matched.matches.map((entry) => entry.id).join("\u3001")}`
    };
  }
  const picked = selectReloadEntries(entries, matched);
  const clientIds = listClientReloadIds(ctx, matched);
  if (!picked.ok) {
    if (clientIds.length > 0) return { kind: "ok", ordered: [], clientIds, matched };
    return { kind: "error", text: picked.message };
  }
  const ordered = orderReloadQueue(picked.selected);
  if (ordered.length === 0 && clientIds.length === 0) {
    return { kind: "success", text: "\u6CA1\u6709\u53EF\u70ED\u91CD\u8F7D\u7684\u63D2\u4EF6\u3002\u8FDE\u63A5\u9AA8\u67B6\u8BF7\u7528 /reboot\u3002" };
  }
  return { kind: "ok", ordered, clientIds, matched };
}
function listClientReloadIds(ctx, matched) {
  const modules = ctx.get("clientModules");
  const ids = (modules?.graph?.().entries ?? []).map((entry) => entry.id).filter((id) => typeof id === "string" && id.length > 0);
  return selectClientReloadIds(ids, matched);
}
async function publishProgress(ctx, options, progress, extra) {
  const settings = ctx.get("settings");
  options.publishReload?.(progress, extra);
  await settings?.update?.(options.settingsNs, {
    reloadProgress: progress,
    ...extra?.names === void 0 ? {} : { reloadNames: [...extra.names] },
    ...extra?.clientIds === void 0 ? {} : { reloadClientIds: [...extra.clientIds] }
  });
}
async function runReloadQueue(ctx, options, ordered, clientIds) {
  const settings = ctx.get("settings");
  const { others, marketplace } = partitionReloadEntries(ordered);
  const names = [...others, ...marketplace].map((entry) => entry.id);
  for (const id of clientIds) {
    if (!names.includes(id)) names.push(id);
  }
  const accepted = formatReloadAccepted(
    [...others, ...marketplace],
    clientIds
  );
  await publishProgress(ctx, options, {
    phase: "running",
    current: others[0]?.id ?? clientIds[0] ?? "",
    index: 0,
    total: names.length,
    ok: 0,
    failed: 0,
    message: accepted
  }, { clientIds, names });
  const failures = [];
  let ok = 0;
  let index = 0;
  for (const entry of others) {
    index += 1;
    await publishProgress(ctx, options, {
      phase: "running",
      current: entry.id,
      index,
      total: names.length,
      ok,
      failed: failures.length,
      message: `\u6B63\u5728\u91CD\u8F7D ${entry.id}\uFF08${String(index)}/${String(names.length)}\uFF09`
    }, { clientIds, names });
    const result = await reloadHostEntry(entry);
    if (result.ok) ok += 1;
    else failures.push(`${entry.id}: ${result.message}`);
  }
  const finished = ok + marketplace.length;
  const summary = formatReloadFinished(finished, failures.length);
  const text = formatReloadOutcome(summary, names);
  await publishProgress(ctx, options, {
    phase: "done",
    current: "",
    index: others.length,
    total: names.length,
    ok: finished,
    failed: failures.length,
    message: summary
  }, { clientIds, names });
  setTimeout(() => {
    void (async () => {
      for (const entry of marketplace) {
        await reloadHostEntry(entry);
      }
      await requestBrowserReload(settings, options.settingsNs, clientIds, names);
      const nonce = settings?.get?.(options.settingsNs)?.reloadNonce ?? 0;
      options.publishReload?.({
        phase: "done",
        current: "",
        index: others.length + marketplace.length,
        total: names.length,
        ok: finished,
        failed: failures.length,
        message: summary
      }, { nonce, clientIds, names });
    })().catch((error) => {
      console.error("plugin-marketplace: trailing reload failed", error);
    });
  }, 50);
  return {
    kind: failures.length === 0 ? "success" : "error",
    text
  };
}
function orderReloadQueue(entries) {
  const { others, marketplace } = partitionReloadEntries(entries);
  return [...others, ...marketplace];
}
function handleUpdate(profile, rawInput) {
  const manifest = readProfileManifest("plugin-marketplace", profile.dir);
  const dependencies = Object.keys(manifest.dependencies ?? {});
  const matched = resolveUpdateTarget(dependencies, rawInput);
  if (matched.kind === "none") {
    return { kind: "error", text: `${JSON.stringify(matched.query)} \u4E0D\u662F profile \u4F9D\u8D56\uFF0C\u4E0D\u80FD\u66F4\u65B0\u3002` };
  }
  if (matched.kind === "ambiguous") {
    return { kind: "error", text: `\u6709\u591A\u4E2A\u4F9D\u8D56\u5339\u914D\uFF1A${matched.matches.join("\u3001")}` };
  }
  const args = matched.kind === "all" ? ["update"] : ["update", matched.name];
  const before = readProfileManifest("plugin-marketplace", profile.dir);
  const result = runProfilePnpm({ profileDir: profile.dir, args, stdio: "pipe" });
  if (result.missingPnpm) return { kind: "error", text: "\u627E\u4E0D\u5230 pnpm\uFF0C\u8BF7\u5148\u5B89\u88C5 pnpm \u518D\u66F4\u65B0\u63D2\u4EF6\u3002" };
  if (result.exitCode !== 0) {
    return { kind: "error", text: result.stderr.trim() || result.stdout.trim() || `pnpm \u9000\u51FA\u7801 ${String(result.exitCode)}` };
  }
  reconcileProfilePlugins({
    binName: "plugin-marketplace",
    installAnchor: profile.installAnchor,
    profileDir: profile.dir,
    before
  });
  return {
    kind: "success",
    text: "\u5DF2\u66F4\u65B0\u3002\u8981\u52A0\u8F7D\u65B0\u4EE3\u7801\u8BF7\u8FD0\u884C /reload\uFF1B\u8981\u91CD\u542F\u8FDB\u7A0B\u8BF7\u8FD0\u884C /reboot\u3002"
  };
}

// src/host/defaults.ts
var DEFAULT_CATALOG_URL = "https://raw.githubusercontent.com/StarPivotNet/dsh-plugin-catalog/main/catalog.json";

// src/host/hmr-pin.ts
var CLIENT_HMR_NAMESPACE = "client-hmr";
function pinAutoReloadOff(settings, ns = CLIENT_HMR_NAMESPACE) {
  if (settings?.update === void 0) return void 0;
  if (settings.get?.(ns)?.autoReload !== true) return void 0;
  try {
    return Promise.resolve(settings.update(ns, { autoReload: false })).catch(() => void 0);
  } catch {
    return void 0;
  }
}

// src/host/index.ts
var name = "plugin-marketplace";
var inject = ["loader", "profile", "connection"];
var MARKETPLACE_BUNDLE_PACKAGE = "@starpivot/dsh-plugin-marketplace";
var MARKETPLACE_HOST_ENTRY_ID = "plugin-marketplace";
var MARKETPLACE_CLIENT_ENTRY_ID = "ui-settings-plugin-marketplace";
var MARKETPLACE_SETTINGS_NAMESPACE = "plugin-marketplace";
var SETTINGS_NS = settingsNamespace(MARKETPLACE_SETTINGS_NAMESPACE);
var CHANNEL = "/plugin-marketplace";
var FIBER_PHASE = {
  0: "pending",
  1: "loading",
  2: "active",
  3: "failed",
  4: null,
  5: "unloading"
};
function fail(code, message) {
  return { ok: false, code, message };
}
function apply(ctx, config = {}) {
  const resolved = {
    catalogUrls: normalizeCatalogUrls(config.catalogUrls, config.catalogUrl ?? DEFAULT_CATALOG_URL),
    catalogTimeoutMs: config.catalogTimeoutMs ?? 1e4
  };
  for (const url of resolved.catalogUrls) {
    if (!isCatalogUrl(url) || url.length === 0) {
      throw new Error(`plugin-marketplace: catalog URL must be http(s): ${url}`);
    }
  }
  ctx.inject(["settings"], (settingsCtx) => {
    const settings = settingsCtx.get("settings");
    settings.register(SETTINGS_NS, z.object({
      catalogUrls: z.array(z.string()).default([]),
      reloadNonce: z.number().default(0),
      rebootNonce: z.number().default(0),
      reloadClientIds: z.array(z.string()).default([]),
      reloadNames: z.array(z.string()).default([]),
      reloadProgress: z.object({
        phase: z.union([z.const("idle"), z.const("running"), z.const("done")]).default("idle"),
        current: z.string().default(""),
        index: z.number().default(0),
        total: z.number().default(0),
        ok: z.number().default(0),
        failed: z.number().default(0),
        message: z.string().default("")
      }).default({ phase: "idle", current: "", index: 0, total: 0, ok: 0, failed: 0, message: "" })
    }), {
      base: {
        catalogUrls: resolved.catalogUrls,
        reloadNonce: 0,
        rebootNonce: 0,
        reloadClientIds: [],
        reloadNames: [],
        reloadProgress: { phase: "idle", current: "", index: 0, total: 0, ok: 0, failed: 0, message: "" }
      }
    });
  });
  pinClientAutoReloadOff(ctx);
  let inflight;
  let reloadLive = snapshotFromSettings(
    ctx.get("settings")?.get?.(SETTINGS_NS)
  );
  ctx.inject(["settings"], (settingsCtx) => {
    const settings = settingsCtx.get("settings");
    reloadLive = snapshotFromSettings(settings?.get?.(SETTINGS_NS));
    if (process.env.DSH_MARKETPLACE_REBOOT !== void 0) {
      void requestBrowserReboot(settings, SETTINGS_NS).then((rebootNonce) => {
        reloadLive = { ...reloadLive, rebootNonce };
      }).catch((error) => {
        console.error("plugin-marketplace: reboot nonce failed", error);
      });
    }
  });
  ctx.inject(["commands"], (commandCtx) => {
    registerMarketplaceCommands(commandCtx, {
      requireProfile: () => requireProfile(commandCtx),
      webPort: () => commandCtx.get("webServer")?.port,
      settingsNs: SETTINGS_NS,
      publishReload: (progress, extra) => {
        reloadLive = {
          ...progress,
          nonce: extra?.nonce ?? reloadLive.nonce,
          clientIds: extra?.clientIds ?? reloadLive.clientIds,
          names: extra?.names ?? reloadLive.names,
          rebootNonce: extra?.rebootNonce ?? reloadLive.rebootNonce
        };
      },
      exitProcess: () => {
        const exit = commandCtx.get("appExit");
        if (exit !== void 0) exit(0);
        else process.exit(0);
      }
    });
  });
  const marketplace = {
    listInstalled() {
      const profile = requireProfile(ctx);
      const manifest = readProfileManifest2("plugin-marketplace", profile.dir);
      const dependencies = manifest.dependencies ?? {};
      const bundles = new Set(manifest.dsh?.profile?.bundles ?? []);
      const byPackage = /* @__PURE__ */ new Map();
      for (const [packageName, spec] of Object.entries(dependencies)) {
        const isBundle = packageExportsBundle(
          "plugin-marketplace",
          packageName,
          profile.installAnchor,
          profile.dir
        );
        const kind = isBundle || bundles.has(packageName) ? "bundle" : "dependency";
        byPackage.set(packageName, {
          packageName,
          spec,
          kind,
          installed: true,
          entryIds: [],
          enabled: true,
          fiberPhase: null,
          canUninstall: packageName !== MARKETPLACE_BUNDLE_PACKAGE,
          canToggle: false
        });
      }
      for (const entry of ctx.loader.entries()) {
        if (entry.options.group) continue;
        const packageName = entry.options.name;
        const existing = byPackage.get(packageName);
        const fiberPhase = entry.fiber === void 0 ? null : FIBER_PHASE[entry.fiber.state] ?? null;
        const enabled = !entry.disabled;
        if (existing !== void 0) {
          const entryIds = [...existing.entryIds, entry.id];
          byPackage.set(packageName, {
            ...existing,
            entryIds,
            enabled: existing.enabled && enabled,
            fiberPhase: mergePhase(existing.fiberPhase, fiberPhase),
            canToggle: entryIds.length === 1 && packageName !== MARKETPLACE_BUNDLE_PACKAGE && entry.id !== MARKETPLACE_HOST_ENTRY_ID && entry.id !== MARKETPLACE_CLIENT_ENTRY_ID
          });
          continue;
        }
        byPackage.set(packageName, {
          packageName,
          spec: "",
          kind: "inbox",
          installed: true,
          entryIds: [entry.id],
          enabled,
          fiberPhase,
          canUninstall: false,
          canToggle: entry.id !== MARKETPLACE_HOST_ENTRY_ID && entry.id !== MARKETPLACE_CLIENT_ENTRY_ID
        });
      }
      return { profileName: profile.name, entries: [...byPackage.values()] };
    },
    async listCatalog() {
      const urls = effectiveCatalogUrls(ctx, resolved.catalogUrls);
      if (urls.length === 0) return emptyCatalog();
      const sources = [];
      const entries = [];
      const seen = /* @__PURE__ */ new Set();
      for (const url of urls) {
        const fetched = await fetchCatalog(url, resolved.catalogTimeoutMs);
        sources.push(fetched.source);
        if (!fetched.ok) continue;
        for (const entry of fetched.entries) {
          if (seen.has(entry.name)) continue;
          seen.add(entry.name);
          entries.push(entry);
        }
      }
      return { configured: true, sources, entries };
    },
    install(request) {
      return serialize(async () => {
        if (!isRegistryPackageName(request.name)) {
          return fail("package-invalid", "install accepts one npm registry package name");
        }
        if (request.version !== void 0 && request.version.length > 0 && !isInstallVersion(request.version)) {
          return fail("version-invalid", "install version must be a semver or tag fragment");
        }
        return runPnpm(ctx, ["add", installSpec(request.name, request.version)]);
      });
    },
    uninstall(request) {
      return serialize(async () => {
        if (!isRegistryPackageName(request.name)) {
          return fail("package-invalid", "uninstall accepts one npm registry package name");
        }
        if (request.name === MARKETPLACE_BUNDLE_PACKAGE) {
          return fail("protected", "the marketplace bundle cannot uninstall itself");
        }
        const profile = requireProfile(ctx);
        const manifest = readProfileManifest2("plugin-marketplace", profile.dir);
        if (manifest.dependencies?.[request.name] === void 0) {
          return fail("not-installed", `${request.name} is not a profile dependency`);
        }
        return runPnpm(ctx, ["remove", request.name]);
      });
    },
    setEnabled(request) {
      return serialize(async () => {
        if (request.entryId === MARKETPLACE_HOST_ENTRY_ID || request.entryId === MARKETPLACE_CLIENT_ENTRY_ID) {
          return fail("protected", "the marketplace entries cannot be disabled from the marketplace");
        }
        const listed = marketplace.listInstalled().entries.find((entry) => entry.entryIds.includes(request.entryId));
        if (listed === void 0) {
          return fail("entry-missing", `no installed plugin owns entry ${request.entryId}`);
        }
        if (!listed.canToggle) {
          return fail("not-toggleable", `${listed.packageName} cannot be enabled or disabled as a single entry`);
        }
        const profile = requireProfile(ctx);
        const patches = readProfilePatches("plugin-marketplace", profile.dir);
        writeProfilePatches(profile.dir, applyEnablement(patches, request.entryId, request.enabled));
        return { ok: true };
      });
    }
  };
  async function serialize(work) {
    if (inflight !== void 0) return fail("busy", "another marketplace mutation is still running");
    const run = work();
    inflight = run;
    try {
      return await run;
    } finally {
      inflight = void 0;
    }
  }
  ctx.connection.rpc.handle(CHANNEL, async (endpoint, payload) => {
    try {
      switch (endpoint) {
        case "listInstalled":
          return { ok: true, value: marketplace.listInstalled() };
        case "listCatalog":
          return { ok: true, value: await marketplace.listCatalog() };
        case "install":
          return { ok: true, value: await marketplace.install(payload) };
        case "uninstall":
          return { ok: true, value: await marketplace.uninstall(payload) };
        case "setEnabled":
          return { ok: true, value: await marketplace.setEnabled(payload) };
        case "reloadStatus":
          return { ok: true, value: reloadLive };
        default:
          return { ok: false, error: { code: "NOT_FOUND", message: "unknown marketplace endpoint" } };
      }
    } catch (error) {
      return {
        ok: false,
        error: { code: "INTERNAL", message: error instanceof Error ? error.message : String(error) }
      };
    }
  }, { authority: "loopback" });
}
var CLIENT_HMR_NS = settingsNamespace(CLIENT_HMR_NAMESPACE);
function pinClientAutoReloadOff(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    const settings = settingsCtx.get("settings");
    if (settings === void 0) return;
    let pinning = false;
    const pin = () => {
      if (pinning) return;
      const write = pinAutoReloadOff(settings, CLIENT_HMR_NS);
      if (write === void 0) return;
      pinning = true;
      void Promise.resolve(write).finally(() => {
        pinning = false;
      });
    };
    pin();
    const off = settingsCtx.on("settings/updated", (ns) => {
      if (String(ns) === CLIENT_HMR_NAMESPACE) pin();
    });
    settingsCtx.effect(() => () => {
      off();
    }, "plugin-marketplace: pin client-hmr.autoReload off");
  });
}
function requireProfile(ctx) {
  const profile = ctx.get("profile");
  if (profile === void 0) throw new Error("plugin-marketplace: ctx.profile is required");
  return profile;
}
function effectiveCatalogUrls(ctx, fallback) {
  const section = ctx.get("settings")?.get?.(SETTINGS_NS);
  const fromSettings = normalizeCatalogUrls(section?.catalogUrls ?? section?.catalogUrl);
  return fromSettings.length > 0 ? fromSettings : [...fallback];
}
async function fetchCatalog(url, timeoutMs) {
  if (!isCatalogUrl(url) || url.length === 0) {
    return {
      ok: false,
      source: { url, title: sourceTitleFromUrl(url), ok: false, error: "URL must be http(s)", count: 0 }
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!response.ok) {
      return {
        ok: false,
        source: { url, title: sourceTitleFromUrl(url), ok: false, error: `HTTP ${String(response.status)}`, count: 0 }
      };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_CATALOG_BYTES) {
      return {
        ok: false,
        source: { url, title: sourceTitleFromUrl(url), ok: false, error: "catalog too large", count: 0 }
      };
    }
    let parsed;
    try {
      parsed = JSON.parse(buffer.toString("utf8"));
    } catch {
      return {
        ok: false,
        source: { url, title: sourceTitleFromUrl(url), ok: false, error: "catalog is not JSON", count: 0 }
      };
    }
    const document = parseCatalogDocument(parsed, url);
    if (!document.ok) {
      return { ok: false, source: { url, title: sourceTitleFromUrl(url), ok: false, error: document.message, count: 0 } };
    }
    return {
      ok: true,
      source: { url, title: document.title, ok: true, count: document.entries.length },
      entries: document.entries.map((entry) => ({ ...entry, sourceUrl: url, sourceTitle: document.title }))
    };
  } catch (error) {
    return {
      ok: false,
      source: {
        url,
        title: sourceTitleFromUrl(url),
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        count: 0
      }
    };
  } finally {
    clearTimeout(timer);
  }
}
function runPnpm(ctx, args) {
  const profile = requireProfile(ctx);
  const before = readProfileManifest2("plugin-marketplace", profile.dir);
  const result = runProfilePnpm2({ profileDir: profile.dir, args, stdio: "pipe" });
  if (result.missingPnpm) {
    return fail("pnpm-missing", "pnpm is not on PATH; install pnpm to manage profile plugins");
  }
  if (result.exitCode !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `pnpm exited ${String(result.exitCode)}`;
    return fail("pnpm-failed", detail);
  }
  reconcileProfilePlugins2({
    binName: "plugin-marketplace",
    installAnchor: profile.installAnchor,
    profileDir: profile.dir,
    before
  });
  return { ok: true, restartRequired: true };
}
function mergePhase(left, right) {
  if (left === right) return left;
  if (left === null) return right;
  if (right === null) return left;
  return "mixed";
}
function applyEnablement(patches, entryId, enabled) {
  const next = patches.map((patch) => ({ ...patch }));
  const index = next.findIndex((patch) => patch.id === entryId && patch.insert === void 0);
  if (enabled) {
    if (index === -1) return next;
    const current = { ...next[index] };
    delete current.disabled;
    if (Object.keys(current).filter((key) => key !== "id").length === 0) {
      next.splice(index, 1);
      return next;
    }
    next[index] = current;
    return next;
  }
  if (index === -1) {
    next.push({ id: entryId, disabled: true });
    return next;
  }
  next[index] = { ...next[index], disabled: true };
  return next;
}
export {
  DEFAULT_CATALOG_URL,
  MARKETPLACE_BUNDLE_PACKAGE,
  MARKETPLACE_CLIENT_ENTRY_ID,
  MARKETPLACE_HOST_ENTRY_ID,
  MARKETPLACE_SETTINGS_NAMESPACE,
  apply,
  inject,
  name
};
