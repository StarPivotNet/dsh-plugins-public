// src/host/index.ts
import {
  packageExportsBundle,
  readProfileManifest,
  readProfilePatches,
  reconcileProfilePlugins,
  runProfilePnpm,
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
  let inflight;
  const marketplace = {
    listInstalled() {
      const profile = requireProfile(ctx);
      const manifest = readProfileManifest("plugin-marketplace", profile.dir);
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
        const manifest = readProfileManifest("plugin-marketplace", profile.dir);
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
  const before = readProfileManifest("plugin-marketplace", profile.dir);
  const result = runProfilePnpm({ profileDir: profile.dir, args, stdio: "pipe" });
  if (result.missingPnpm) {
    return fail("pnpm-missing", "pnpm is not on PATH; install pnpm to manage profile plugins");
  }
  if (result.exitCode !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `pnpm exited ${String(result.exitCode)}`;
    return fail("pnpm-failed", detail);
  }
  reconcileProfilePlugins({
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
