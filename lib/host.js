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
async function reloadHostEntry(entry) {
  if (!entry.enabled) return { ok: false, message: `entry ${entry.id} is disabled` };
  try {
    const fiber = entry.fiber;
    if (fiber !== void 0) {
      entry.fiber = void 0;
      await fiber.dispose();
    }
    await entry.refresh();
    await entry.fiber?.await();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
async function reloadClientPlugins(port) {
  if (port === void 0 || !Number.isInteger(port) || port <= 0) {
    return "skipped client reload (no webServer port)";
  }
  const response = await fetch(`http://127.0.0.1:${String(port)}/plugins/reload`, { method: "POST" });
  if (!response.ok) return `client reload failed: HTTP ${String(response.status)}`;
  return "client plugins reloaded";
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
var REBOOT_COOLDOWN_MS = 15e3;
function rebootBlocked(now = Date.now(), env = process.env) {
  const raw = env[REBOOT_ENV];
  if (raw === void 0 || raw.length === 0) return void 0;
  const started = Number(raw);
  if (!Number.isFinite(started)) return void 0;
  if (now - started < REBOOT_COOLDOWN_MS) {
    return "dsh just restarted; wait a few seconds before /reboot again";
  }
  return void 0;
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
    argv: process.argv.slice(1),
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
    return { ok: false, message: "failed to spawn reboot watchdog" };
  }
  child.unref();
  const alive = await waitUntil(() => processAlive(child.pid), 2e3);
  if (!alive) return { ok: false, message: "reboot watchdog exited before dsh handed off" };
  return { ok: true, pid: child.pid };
}

// src/host/commands.ts
function registerMarketplaceCommands(ctx, options) {
  ctx.commands.register({
    name: "reload",
    description: "Reload plugins without restarting dsh. Omit the name to reload all.",
    input: { hint: "[plugin name]" },
    handler: (invocation) => handleReload(ctx, invocation.rawInput)
  });
  ctx.commands.register({
    name: "update",
    description: "Update installed profile plugins. Does not reload.",
    input: { hint: "[plugin name]" },
    handler: (invocation) => handleUpdate(options.requireProfile(), invocation.rawInput)
  });
  ctx.commands.register({
    name: "reboot",
    description: "Restart the dsh process through a watchdog.",
    handler: async () => {
      options.pinAutoReloadOff();
      const blocked = rebootBlocked();
      if (blocked !== void 0) return { kind: "error", text: blocked };
      const spec = buildRebootSpec({ port: options.webPort() });
      const specPath = writeRebootSpec(spec);
      const watchdogPath = join2(dirname(fileURLToPath(import.meta.url)), "reboot-watchdog.js");
      const started = await startWatchdog(watchdogPath, specPath);
      if (!started.ok) return { kind: "error", text: started.message };
      setTimeout(() => {
        options.exitProcess();
      }, 0);
      return { kind: "success", text: "Watchdog is ready. Exiting so dsh can restart\u2026" };
    }
  });
}
async function handleReload(ctx, rawInput) {
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
    refresh: () => entry.refresh()
  }));
  const matched = matchReloadTarget(entries, rawInput);
  if (matched.kind === "none") {
    const hint = matched.suggestions.length > 0 ? ` Did you mean: ${matched.suggestions.join(", ")}` : "";
    return { kind: "error", text: `No plugin matches ${JSON.stringify(matched.query)}.${hint}` };
  }
  if (matched.kind === "ambiguous") {
    return {
      kind: "error",
      text: `Several plugins match ${JSON.stringify(matched.query)}: ${matched.matches.map((entry) => entry.id).join(", ")}`
    };
  }
  const selected = matched.kind === "one" ? entries.filter((entry) => entry.id === matched.entry.id) : entries.filter((entry) => entry.enabled && entry.id !== "plugin-marketplace");
  const failures = [];
  let ok = 0;
  for (const entry of selected) {
    const result = await reloadHostEntry(entry);
    if (result.ok) ok += 1;
    else failures.push(`${entry.id}: ${result.message}`);
  }
  const port = ctx.get("webServer")?.port;
  const client = await reloadClientPlugins(port);
  const summary = `Reloaded ${String(ok)} host plugin(s). ${client}`;
  if (failures.length === 0) return { kind: "success", text: summary };
  return { kind: "error", text: `${summary} Failed: ${failures.join("; ")}` };
}
function handleUpdate(profile, rawInput) {
  const manifest = readProfileManifest("plugin-marketplace", profile.dir);
  const dependencies = Object.keys(manifest.dependencies ?? {});
  const matched = resolveUpdateTarget(dependencies, rawInput);
  if (matched.kind === "none") {
    return { kind: "error", text: `${JSON.stringify(matched.query)} is not a profile dependency and cannot be updated.` };
  }
  if (matched.kind === "ambiguous") {
    return { kind: "error", text: `Several dependencies match: ${matched.matches.join(", ")}` };
  }
  const args = matched.kind === "all" ? ["update"] : ["update", matched.name];
  const before = readProfileManifest("plugin-marketplace", profile.dir);
  const result = runProfilePnpm({ profileDir: profile.dir, args, stdio: "pipe" });
  if (result.missingPnpm) return { kind: "error", text: "pnpm is not on PATH; install pnpm to update plugins." };
  if (result.exitCode !== 0) {
    return { kind: "error", text: result.stderr.trim() || result.stdout.trim() || `pnpm exited ${String(result.exitCode)}` };
  }
  reconcileProfilePlugins({
    binName: "plugin-marketplace",
    installAnchor: profile.installAnchor,
    profileDir: profile.dir,
    before
  });
  return {
    kind: "success",
    text: "Updated. Run /reload to load the new code, or /reboot to restart the process."
  };
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
    catalogUrls: normalizeCatalogUrls(config.catalogUrls, config.catalogUrl ?? ""),
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
      catalogUrls: z.array(z.string()).default([])
    }), {
      base: { catalogUrls: resolved.catalogUrls }
    });
  });
  pinClientAutoReloadOff(ctx);
  ctx.inject(["commands"], (commandCtx) => {
    registerMarketplaceCommands(commandCtx, {
      requireProfile: () => requireProfile(commandCtx),
      webPort: () => commandCtx.get("webServer")?.port,
      pinAutoReloadOff: () => {
        pinClientAutoReloadOff(commandCtx);
      },
      exitProcess: () => {
        const exit = commandCtx.get("appExit");
        if (exit !== void 0) exit(0);
        else process.exit(0);
      }
    });
  });
  let inflight;
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
var CLIENT_HMR_NS = settingsNamespace("client-hmr");
function pinClientAutoReloadOff(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    const settings = settingsCtx.get("settings");
    if (settings === void 0) return;
    let previous;
    let pinning = false;
    const pin = () => {
      if (pinning) return;
      const section = settings.get?.(CLIENT_HMR_NS);
      if (section?.autoReload !== true) return;
      if (previous === void 0) previous = true;
      pinning = true;
      void Promise.resolve(settings.update?.(CLIENT_HMR_NS, { autoReload: false })).finally(() => {
        pinning = false;
      });
    };
    pin();
    const off = settingsCtx.on("settings/updated", (ns) => {
      if (String(ns) === "client-hmr") pin();
    });
    settingsCtx.effect(() => () => {
      off();
      if (previous === true) void settings.update?.(CLIENT_HMR_NS, { autoReload: true });
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
  MARKETPLACE_BUNDLE_PACKAGE,
  MARKETPLACE_CLIENT_ENTRY_ID,
  MARKETPLACE_HOST_ENTRY_ID,
  MARKETPLACE_SETTINGS_NAMESPACE,
  apply,
  inject,
  name
};
