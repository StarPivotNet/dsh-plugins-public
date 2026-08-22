window.__ModuleLoader__.load({ id: "@starpivot/dsh-file-drop", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
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

// src/plugin.ts
var plugin_exports = {};
__export(plugin_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(plugin_exports);

// src/logic.ts
var IMAGE_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
var IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
var DEFAULT_MAX_STAGE_BYTES = 8 * 1024 * 1024;
function isImageMediaType(type) {
  return IMAGE_MEDIA_TYPES.includes(type);
}
function basename(path) {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path;
}
function extname(name) {
  const base = basename(name);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot).toLowerCase();
}
function looksLikeImage(file) {
  return isImageMediaType(file.type) || IMAGE_EXTENSIONS.includes(extname(file.name));
}
function shouldTakeOver(files, hasDirectory) {
  if (hasDirectory) return true;
  if (files.length === 0) return false;
  return files.some((file) => !looksLikeImage({ name: file.name ?? "", type: file.type }));
}
function shouldClaimTransfer(input) {
  if (input.hasDirectory) return true;
  if (input.itemTypes.some((type) => type !== "" && !isImageMediaType(type))) return true;
  if (input.files.length > 0) return shouldTakeOver(input.files, false);
  return input.forDrop && input.uriListAvailable && input.itemTypes.length === 0 && input.files.length === 0;
}
function fileUrlToPath(url) {
  const trimmed = url.trim();
  if (!trimmed.toLowerCase().startsWith("file:")) return null;
  try {
    const parsed = new URL(trimmed);
    let path = decodeURIComponent(parsed.pathname);
    if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
    return path;
  } catch {
    return null;
  }
}
function parseUriList(raw) {
  const paths = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const fromUrl = fileUrlToPath(trimmed);
    if (fromUrl !== null) {
      paths.push(fromUrl);
      continue;
    }
    if (trimmed.startsWith("/") || /^[A-Za-z]:[\\/]/.test(trimmed)) paths.push(trimmed);
  }
  return paths;
}
function resolveDroppedPath(file, uris) {
  if (typeof file.path === "string" && file.path.length > 0) return file.path;
  const matches = uris.filter((uri) => basename(uri) === file.name);
  if (matches.length === 1) return matches[0];
  return void 0;
}
function quotePath(path) {
  if (!/[\s"'\\]/.test(path)) return path;
  return '"' + path.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
function formatDroppedPaths(paths) {
  return paths.map(quotePath).join("\n");
}
function joinInsertion(existing, chunk) {
  if (chunk.length === 0) return { next: existing, caret: existing.length };
  if (existing.length === 0) return { next: chunk, caret: chunk.length };
  const sep = existing.endsWith("\n") ? "" : "\n";
  const next = existing + sep + chunk;
  return { next, caret: next.length };
}
function collectDropPaths(files, uriList) {
  const uris = parseUriList(uriList);
  const known = [];
  const missing = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    known.push(path);
  };
  for (const file of files) {
    const path = resolveDroppedPath(file, uris);
    if (path !== void 0) push(path);
    else missing.push(file);
  }
  if (files.length === 0) {
    for (const path of uris) push(path);
  }
  return { known, missing };
}

// src/client.ts
var CHANNEL = "/file-drop";
function droppedFromFile(file) {
  const path = "path" in file && typeof file.path === "string" ? file.path : void 0;
  return { name: file.name, type: file.type, size: file.size, ...path === void 0 || path.length === 0 ? {} : { path } };
}
function fileTransfer(event) {
  const data = event.dataTransfer;
  if (data === null) return null;
  if (data.types.includes("application/x-dsh-tab")) return null;
  if (event.target instanceof Element && event.target.closest("[data-dsh-better-sidebar]") !== null) return null;
  if (data.types.includes("Files") || data.types.includes("text/uri-list")) return data;
  return null;
}
function activeComposer() {
  const cards = document.querySelectorAll("[data-composer-card]");
  for (let i = cards.length - 1; i >= 0; i -= 1) {
    const card = cards[i];
    if (card === void 0) continue;
    const textarea = card.querySelector("textarea");
    if (textarea instanceof HTMLTextAreaElement && !textarea.disabled && !textarea.readOnly) return textarea;
  }
  return null;
}
function insertIntoComposer(chunk) {
  const target = activeComposer();
  if (target === null) return false;
  const { next, caret } = joinInsertion(target.value, chunk);
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (nativeSetter === void 0) return false;
  nativeSetter.call(target, next);
  target.setSelectionRange(caret, caret);
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromDrop", data: chunk }));
  target.focus({ preventScroll: true });
  return true;
}
async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 32768;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}
function showOverlay(labels) {
  const existing = document.getElementById("dsh-file-drop-overlay");
  if (existing !== null) return existing;
  const mask = document.createElement("div");
  mask.id = "dsh-file-drop-overlay";
  mask.setAttribute("role", "status");
  mask.style.cssText = [
    "position:fixed;inset:0;z-index:1100;pointer-events:none;display:flex;",
    "align-items:center;justify-content:center;padding:40px;",
    "background:var(--dsw-alias-bg-mask-drop, rgba(0,0,0,.45));",
    "backdrop-filter:blur(10px);color:var(--dsw-alias-label-primary,#fff);text-align:center;"
  ].join("");
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;max-width:520px;";
  const title = document.createElement("div");
  title.dataset.role = "title";
  title.style.cssText = "font:var(--dsw-font-l-20, 20px/28px sans-serif);margin-top:16px;";
  title.textContent = labels.title;
  const desc = document.createElement("div");
  desc.dataset.role = "desc";
  desc.style.cssText = "font:var(--dsw-font-s-14, 14px/22px sans-serif);color:var(--dsw-alias-label-tertiary,#bbb);margin-top:16px;white-space:pre-wrap;";
  desc.textContent = labels.desc;
  wrap.append(title, desc);
  mask.append(wrap);
  document.body.append(mask);
  return mask;
}
function updateOverlay(labels) {
  const mask = document.getElementById("dsh-file-drop-overlay");
  if (mask === null) return;
  const title = mask.querySelector("[data-role=title]");
  const desc = mask.querySelector("[data-role=desc]");
  if (title !== null) title.textContent = labels.title;
  if (desc !== null) desc.textContent = labels.desc;
}
function hideOverlay() {
  document.getElementById("dsh-file-drop-overlay")?.remove();
}
function clearStockOverlay() {
  window.dispatchEvent(new Event("dragend"));
}
function defaultToast(text) {
  const existing = document.getElementById("dsh-file-drop-toast");
  existing?.remove();
  const toast = document.createElement("div");
  toast.id = "dsh-file-drop-toast";
  toast.setAttribute("role", "status");
  toast.textContent = text;
  toast.style.cssText = [
    "position:fixed;z-index:1200;left:50%;bottom:88px;transform:translateX(-50%);",
    "max-width:min(560px,calc(100vw - 32px));padding:10px 14px;border-radius:10px;",
    "background:var(--dsw-alias-bg-float, #2a2a2e);color:var(--dsw-alias-label-primary,#fff);",
    "font:var(--dsw-font-s-14, 14px/22px sans-serif);box-shadow:var(--dsw-shadow-lv3, 0 8px 24px rgba(0,0,0,.35));",
    "white-space:pre-wrap;"
  ].join("");
  document.body.append(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 4e3);
}
function installFileDropInterceptor(options) {
  let depth = 0;
  let takingOver = false;
  let busy = false;
  const hideOurs = () => {
    depth = 0;
    takingOver = false;
    hideOverlay();
  };
  const classify = (data, forDrop) => {
    const files = [...data.files].map(droppedFromFile);
    const items = data.items;
    const itemTypes = [];
    let hasDirectory = false;
    if (items !== void 0) {
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (item === void 0 || item.kind !== "file") continue;
        itemTypes.push(item.type);
        const entry = typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null;
        if (entry !== null && entry.isDirectory) hasDirectory = true;
      }
    }
    return shouldClaimTransfer({
      files,
      itemTypes,
      hasDirectory,
      uriListAvailable: data.types.includes("text/uri-list"),
      forDrop
    });
  };
  const claim = (event, data) => {
    event.preventDefault();
    event.stopPropagation();
    data.dropEffect = "copy";
    showOverlay(options.labels);
    updateOverlay(options.labels);
  };
  const onDragEnter = (event) => {
    const data = fileTransfer(event);
    if (data === null) return;
    takingOver = classify(data, false);
    if (!takingOver) return;
    depth += 1;
    claim(event, data);
  };
  const onDragOver = (event) => {
    const data = fileTransfer(event);
    if (data === null) return;
    takingOver = classify(data, false);
    if (!takingOver) return;
    claim(event, data);
  };
  const onDragLeave = (event) => {
    if (fileTransfer(event) === null) return;
    if (!takingOver) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) hideOurs();
  };
  const onDrop = (event) => {
    const data = fileTransfer(event);
    if (data === null) return;
    const files = [...data.files];
    const uriList = data.getData("text/uri-list") || data.getData("text/plain");
    const takeoverNow = classify(data, true) || files.length === 0 && uriList.length > 0;
    if (!takeoverNow) {
      hideOurs();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    hideOurs();
    clearStockOverlay();
    if (busy) return;
    busy = true;
    void handleDrop(files, uriList, { ...options, toast: options.toast ?? defaultToast }).finally(() => {
      busy = false;
    });
  };
  document.addEventListener("dragenter", onDragEnter, true);
  document.addEventListener("dragover", onDragOver, true);
  document.addEventListener("dragleave", onDragLeave, true);
  document.addEventListener("drop", onDrop, true);
  window.addEventListener("dragend", hideOurs);
  return () => {
    document.removeEventListener("dragenter", onDragEnter, true);
    document.removeEventListener("dragover", onDragOver, true);
    document.removeEventListener("dragleave", onDragLeave, true);
    document.removeEventListener("drop", onDrop, true);
    window.removeEventListener("dragend", hideOurs);
    hideOverlay();
  };
}
async function handleDrop(files, uriList, options) {
  const collected = collectDropPaths(files.map(droppedFromFile), uriList);
  const paths = [...collected.known];
  const failures = [];
  const missingFiles = collected.missing.map((item) => files.find((file) => file.name === item.name && file.type === item.type && file.size === item.size)).filter((file) => file !== void 0);
  for (const file of missingFiles) {
    try {
      const data = await fileToBase64(file);
      const payload = await options.rpc.call(CHANNEL, "stage", { name: file.name, mediaType: file.type, data });
      if (!payload.ok) throw new Error(payload.error.message);
      paths.push(payload.value.path);
    } catch (error) {
      failures.push(file.name + ": " + (error instanceof Error ? error.message : String(error)));
    }
  }
  if (paths.length > 0) {
    const chunk = formatDroppedPaths(paths);
    if (!insertIntoComposer(chunk)) {
      options.toast?.("\u65E0\u6CD5\u5199\u5165\u8F93\u5165\u6846\uFF1A" + chunk);
    }
  }
  if (failures.length > 0) options.toast?.(failures.join("\n"));
}

// src/plugin.ts
var inject = ["connection"];
var zh = {
  title: "\u62D6\u5165\u6587\u4EF6\u5373\u53EF\u63D2\u5165\u8DEF\u5F84",
  desc: "\u56FE\u7247\u4ECD\u4F5C\u4E3A\u9644\u4EF6\uFF1B\u5176\u5B83\u6587\u4EF6\u5199\u5165\u8F93\u5165\u6846\uFF0C\u6CA1\u6709\u672C\u673A\u8DEF\u5F84\u65F6\u4F1A\u5148\u5B58\u5230 ~/.dsh/dropped"
};
var en = {
  title: "Drop files to insert their paths",
  desc: "Images stay attachments. Other files are inserted as paths; files without a local path are staged under ~/.dsh/dropped."
};
function fileDropRpc(ctx) {
  const rpc = ctx.get("connection").rpc;
  return rpc;
}
function localeOf() {
  const lang = typeof navigator === "undefined" ? "en" : navigator.language;
  return lang.toLowerCase().startsWith("zh") ? zh : en;
}
function apply(ctx) {
  const rpc = fileDropRpc(ctx);
  ctx.effect(() => installFileDropInterceptor({
    rpc,
    labels: localeOf()
  }), "file-drop interceptor");
}

return module.exports; } });
