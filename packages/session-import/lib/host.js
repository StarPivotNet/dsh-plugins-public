// src/host/index.ts
import { homedir as homedir4 } from "node:os";
import { join as join5 } from "node:path";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";

// src/convert/types.ts
var DEFAULT_CONVERT_LIMITS = {
  maxToolResultChars: 32e3,
  maxTextChars: 2e5
};
function importedSessionId(source, nativeId) {
  const safe = nativeId.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return `import-${source}-${safe || "session"}`;
}

// src/host/import.ts
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// src/convert/text.ts
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function parseTime(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? Math.round(value * 1e3) : Math.round(value);
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Math.round(fallback);
}
function epochMs(value, fallback = Date.now()) {
  const rounded = Math.round(value);
  return Number.isSafeInteger(rounded) && rounded >= 0 ? rounded : Math.round(fallback);
}
function truncateChars(text, maxChars) {
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return "\u2026";
  let end = maxChars - 1;
  const unit = text.charCodeAt(end - 1);
  if (unit >= 55296 && unit <= 56319) end -= 1;
  return `${text.slice(0, end)}\u2026`;
}
function flattenText(value, limits = DEFAULT_CONVERT_LIMITS) {
  const parts = [];
  collectText(value, parts);
  return truncateChars(parts.join("\n"), limits.maxTextChars);
}
function collectText(value, parts) {
  if (typeof value === "string") {
    if (value.length > 0) parts.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, parts);
    return;
  }
  if (!isRecord(value)) return;
  const type = asString(value.type);
  if (type === "tool_use" || type === "tool-call" || type === "function_call" || type === "custom_tool_call") {
    return;
  }
  const direct = asString(value.text) ?? asString(value.content) ?? asString(value.thinking) ?? asString(value.output) ?? asString(value.message);
  if (direct !== void 0) {
    parts.push(direct);
    return;
  }
  if (Array.isArray(value.content)) collectText(value.content, parts);
  if (Array.isArray(value.summary)) collectText(value.summary, parts);
}
function encodeArguments(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}
function isInstructionDump(text) {
  const head = text.trimStart();
  return head.startsWith("# AGENTS.md") || head.startsWith("<INSTRUCTIONS>") || head.startsWith("# Claude Code");
}
function fallbackTitle(text, maxChars = 80) {
  const line = text.replace(/\s+/gu, " ").trim();
  return line.length === 0 ? "Imported session" : truncateChars(line, maxChars);
}
function kebabName(raw) {
  const normalized = raw.trim().toLowerCase().replace(/\.[a-z0-9]+$/u, "").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : void 0;
}

// src/convert/events.ts
var SESSION_FORMAT_VERSION = 0;
function convertConversation(conversation, path, limits = DEFAULT_CONVERT_LIMITS) {
  const id = importedSessionId(conversation.source, conversation.nativeId);
  const events = [];
  let seq = 0;
  let turn = 0;
  let openStep = null;
  let nextStep = 1;
  let skipped = 0;
  const pending = /* @__PURE__ */ new Map();
  const push = (type, data, time, surface) => {
    events.push({
      type,
      seq: seq++,
      time,
      data,
      ...surface === true ? { surfaceOp: "append" } : {}
    });
  };
  const closeStep = (time) => {
    if (openStep === null || turn === 0) return;
    for (const [callId, open2] of [...pending]) {
      if (open2.turn !== turn || open2.step !== openStep) continue;
      push("tool/result", toolResultEvent(open2.turn, open2.step, callId, "(imported call had no recorded result)", true, limits), time, true);
      pending.delete(callId);
    }
    push("step/end", { turn, step: openStep }, time);
    openStep = null;
    nextStep += 1;
  };
  const closeTurn = (time) => {
    closeStep(time);
    if (turn === 0) return;
    pending.clear();
    push("turn/end", { turn, reason: { kind: "completed" } }, time);
  };
  const ensureTurn = (time) => {
    if (turn !== 0) return;
    turn = 1;
    nextStep = 1;
    push("turn/start", { turn }, time);
  };
  const ensureStep = (time) => {
    ensureTurn(time);
    if (openStep === null) {
      openStep = nextStep;
      push("step/start", { turn, step: openStep }, time);
    }
    return openStep;
  };
  for (const item of conversation.items) {
    if (item.kind === "user") {
      const text = flattenText(item.text, limits);
      if (text.length === 0) {
        skipped += 1;
        continue;
      }
      closeTurn(item.time);
      turn += 1;
      nextStep = 1;
      push("turn/start", { turn }, item.time);
      push("user/message", {
        id: item.id ?? messageId(conversation.source, conversation.nativeId, seq),
        role: "user",
        content: [{ type: "text", text }],
        source: item.source === "plugin" ? { kind: "plugin", plugin: item.plugin ?? conversation.source, ...item.form === void 0 ? {} : { form: item.form } } : { kind: "user" }
      }, item.time, true);
      continue;
    }
    if (item.kind === "assistant") {
      const step = ensureStep(item.time);
      const content = [];
      const reasoning = flattenText(item.reasoning, limits);
      if (reasoning.length > 0) content.push({ type: "reasoning", text: reasoning });
      const text = flattenText(item.text, limits);
      if (text.length > 0) content.push({ type: "text", text });
      for (const call of item.toolCalls) {
        content.push({
          type: "tool-call",
          id: call.callId,
          name: call.name,
          arguments: call.arguments
        });
        push("tool/call", {
          turn,
          step,
          callId: call.callId,
          name: call.name,
          arguments: call.arguments
        }, item.time);
        pending.set(call.callId, { turn, step });
      }
      if (content.length === 0) content.push({ type: "text", text: "" });
      push("assistant/message", {
        turn,
        step,
        message: {
          id: item.id ?? messageId(conversation.source, conversation.nativeId, seq),
          role: "assistant",
          content,
          source: {
            kind: "model",
            provider: item.provider ?? conversation.provider ?? conversation.source,
            model: item.model ?? conversation.model ?? conversation.source
          }
        }
      }, item.time, true);
      if (pending.size === 0) closeStep(item.time);
      continue;
    }
    const open2 = pending.get(item.callId);
    if (open2 === void 0) {
      skipped += 1;
      continue;
    }
    pending.delete(item.callId);
    push("tool/result", toolResultEvent(open2.turn, open2.step, item.callId, item.text, item.isError, limits), item.time, true);
    const remaining = [...pending.values()].some((entry) => entry.turn === open2.turn && entry.step === open2.step);
    if (!remaining) closeStep(item.time);
  }
  const lastTime = epochMs(conversation.items.at(-1)?.time ?? conversation.updatedAt);
  closeTurn(lastTime);
  const firstUser = conversation.items.find((item) => item.kind === "user" && item.source === "user" && item.text.trim().length > 0 && !item.text.trimStart().startsWith("# AGENTS.md") && !item.text.trimStart().startsWith("# Files mentioned"));
  const title = sessionName(conversation.title?.trim() || (firstUser === void 0 ? "Imported session" : firstUser.text));
  const firstUserEvent = events.find((event) => event.type === "user/message");
  if (title.length > 0) {
    push("session/title", {
      title,
      messageSeqs: firstUserEvent === void 0 ? [] : [firstUserEvent.seq],
      source: firstUserEvent === void 0 ? { kind: "user" } : { kind: "fallback" }
    }, lastTime);
  }
  const importedAt = Date.now();
  const header = {
    version: SESSION_FORMAT_VERSION,
    id,
    createdAt: importedAt,
    ...isAbsolutePath(conversation.cwd) ? { cwd: conversation.cwd } : {},
    seedLength: events.length,
    delegationDepth: 0
  };
  return {
    source: conversation.source,
    nativeId: conversation.nativeId,
    path,
    title,
    header,
    events,
    skipped
  };
}
function toolResultEvent(turn, step, callId, text, isError, limits) {
  const body = truncateChars(text, limits.maxToolResultChars);
  return {
    turn,
    step,
    message: {
      id: `import-tool-${callId}`,
      role: "user",
      source: { kind: "tool", callId },
      content: [{
        type: "tool-result",
        toolCallId: callId,
        content: [{ type: "text", text: body.length === 0 ? "(empty tool result)" : body }],
        isError
      }]
    }
  };
}
function isAbsolutePath(value) {
  return value !== void 0 && (value.startsWith("/") || /^[A-Za-z]:[\\/]/u.test(value));
}
function sessionName(raw, maxChars = 48) {
  const cleaned = raw.replace(/^Automation:\s*/u, "").replace(/\s+Automation ID:.*$/u, "").replace(/\s+/gu, " ").trim();
  return fallbackTitle(cleaned, maxChars);
}
function messageId(source, nativeId, seq) {
  return `import-${source}-${nativeId}-${String(seq)}`;
}

// src/convert/claude.ts
function convertClaudeSession(text, path, limits = DEFAULT_CONVERT_LIMITS) {
  const conversation = extractClaudeConversation(text, path, limits);
  return convertConversation(conversation, path, limits);
}
function extractClaudeConversation(text, path, limits = DEFAULT_CONVERT_LIMITS) {
  const items = [];
  let nativeId = idFromPath(path);
  let title;
  let cwd;
  let createdAt = 0;
  let updatedAt = 0;
  let model;
  for (const raw of text.split(/\r?\n/u)) {
    if (raw.trim().length === 0) continue;
    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!isRecord(record)) continue;
    const type = asString(record.type);
    const time = parseTime(record.timestamp, updatedAt);
    if (time > updatedAt) updatedAt = time;
    if (createdAt === 0 && time > 0) createdAt = time;
    nativeId = asString(record.sessionId) ?? nativeId;
    cwd = asString(record.cwd) ?? cwd;
    if (type === "ai-title") title = asString(record.aiTitle) ?? title;
    if (type === "assistant") {
      const message = isRecord(record.message) ? record.message : void 0;
      model = asString(message?.model) ?? model;
      const extracted = extractAssistant(message, time, limits);
      if (extracted !== void 0) items.push(extracted);
      continue;
    }
    if (type === "user") {
      const extracted = extractUser(record, time, limits);
      items.push(...extracted);
    }
  }
  return {
    source: "claude",
    nativeId,
    title,
    cwd,
    createdAt: createdAt || updatedAt,
    updatedAt: updatedAt || createdAt,
    model,
    provider: "anthropic",
    items
  };
}
function extractAssistant(message, time, limits) {
  if (message === void 0) return void 0;
  const content = message.content;
  const toolCalls = [];
  const texts = [];
  const reasoning = [];
  if (Array.isArray(content)) {
    for (const block of content) {
      if (!isRecord(block)) continue;
      const type = asString(block.type);
      if (type === "tool_use") {
        const callId = asString(block.id);
        const name2 = asString(block.name);
        if (callId === void 0 || name2 === void 0) continue;
        toolCalls.push({ callId, name: name2, arguments: encodeArguments(block.input) });
        continue;
      }
      if (type === "thinking") {
        const text = flattenText(block.thinking ?? block.text, limits);
        if (text.length > 0) reasoning.push(text);
        continue;
      }
      if (type === "text") {
        const text = flattenText(block.text, limits);
        if (text.length > 0) texts.push(text);
      }
    }
  } else {
    const text = flattenText(content, limits);
    if (text.length > 0) texts.push(text);
  }
  if (texts.length === 0 && reasoning.length === 0 && toolCalls.length === 0) return void 0;
  return {
    kind: "assistant",
    id: asString(message.id),
    time,
    text: texts.join("\n"),
    reasoning: reasoning.join("\n"),
    model: asString(message.model),
    provider: "anthropic",
    toolCalls
  };
}
function extractUser(record, time, limits) {
  const message = isRecord(record.message) ? record.message : void 0;
  const content = message?.content ?? record.content;
  const items = [];
  if (Array.isArray(content)) {
    const texts = [];
    for (const block of content) {
      if (!isRecord(block)) continue;
      if (asString(block.type) === "tool_result") {
        const callId = asString(block.tool_use_id) ?? asString(block.toolUseId);
        if (callId === void 0) continue;
        items.push({
          kind: "tool-result",
          time,
          callId,
          text: flattenText(block.content ?? block.text, limits),
          isError: block.is_error === true || block.isError === true
        });
        continue;
      }
      const text2 = flattenText(block, limits);
      if (text2.length > 0) texts.push(text2);
    }
    if (texts.length > 0) {
      items.push({
        kind: "user",
        id: asString(record.uuid),
        time,
        text: texts.join("\n"),
        source: "user"
      });
    }
    return items;
  }
  const text = flattenText(content, limits);
  if (text.length === 0) return items;
  items.push({
    kind: "user",
    id: asString(record.uuid),
    time,
    text,
    source: "user"
  });
  return items;
}
function idFromPath(path) {
  const base = path.split(/[\\/]/u).at(-1) ?? "session";
  return base.replace(/\.jsonl$/u, "");
}

// src/convert/codex.ts
function convertCodexSession(text, path, limits = DEFAULT_CONVERT_LIMITS) {
  return convertConversation(extractCodexConversation(text, path, limits), path, limits);
}
function extractCodexConversation(text, path, limits = DEFAULT_CONVERT_LIMITS) {
  const items = [];
  let nativeId = idFromPath2(path);
  let cwd;
  let createdAt = 0;
  let updatedAt = 0;
  let model;
  let provider;
  let title;
  for (const raw of text.split(/\r?\n/u)) {
    if (raw.trim().length === 0) continue;
    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!isRecord(record)) continue;
    const time = parseTime(record.timestamp, updatedAt);
    if (time > updatedAt) updatedAt = time;
    if (createdAt === 0 && time > 0) createdAt = time;
    const type = asString(record.type);
    const payload = isRecord(record.payload) ? record.payload : record;
    if (type === "session_meta") {
      nativeId = asString(payload.id) ?? asString(payload.session_id) ?? nativeId;
      cwd = asString(payload.cwd) ?? cwd;
      model = asString(payload.model) ?? model;
      provider = asString(payload.model_provider) ?? provider;
      title = asString(payload.thread_name) ?? title;
      continue;
    }
    if (type === "turn_context") {
      model = asString(payload.model) ?? model;
      cwd = asString(payload.cwd) ?? cwd;
      continue;
    }
    if (type !== "response_item") continue;
    const item = extractResponseItem(payload, time, limits);
    if (item !== void 0) items.push(item);
  }
  return {
    source: "codex",
    nativeId,
    title,
    cwd,
    createdAt: createdAt || updatedAt,
    updatedAt: updatedAt || createdAt,
    model,
    provider: provider ?? "openai",
    items
  };
}
function extractResponseItem(payload, time, limits) {
  const type = asString(payload.type);
  if (type === "message") {
    const role = asString(payload.role);
    const text = flattenText(payload.content, limits);
    if (text.length === 0) return void 0;
    if (role === "assistant") {
      return {
        kind: "assistant",
        id: asString(payload.id),
        time,
        text,
        reasoning: "",
        toolCalls: []
      };
    }
    if (role === "developer" || isInstructionDump(text)) {
      return {
        kind: "user",
        id: asString(payload.id),
        time,
        text,
        source: "plugin",
        plugin: "codex",
        form: "instructions"
      };
    }
    if (role === "user" || role === void 0) {
      return {
        kind: "user",
        id: asString(payload.id),
        time,
        text,
        source: "user"
      };
    }
    return void 0;
  }
  if (type === "reasoning") {
    const text = flattenText(payload.summary ?? payload.content ?? payload.text, limits);
    if (text.length === 0) return void 0;
    return {
      kind: "assistant",
      id: asString(payload.id),
      time,
      text: "",
      reasoning: text,
      toolCalls: []
    };
  }
  if (type === "function_call" || type === "custom_tool_call") {
    const callId = asString(payload.call_id) ?? asString(payload.id);
    const name2 = asString(payload.name);
    if (callId === void 0 || name2 === void 0) return void 0;
    const args = encodeArguments(payload.arguments ?? payload.input);
    const call = { callId, name: name2, arguments: args };
    return {
      kind: "assistant",
      id: asString(payload.id),
      time,
      text: "",
      reasoning: "",
      toolCalls: [call]
    };
  }
  if (type === "function_call_output" || type === "custom_tool_call_output") {
    const callId = asString(payload.call_id) ?? asString(payload.id);
    if (callId === void 0) return void 0;
    return {
      kind: "tool-result",
      time,
      callId,
      text: flattenText(payload.output ?? payload.content, limits),
      isError: payload.is_error === true || asString(payload.status) === "failed"
    };
  }
  return void 0;
}
function idFromPath2(path) {
  const base = path.split(/[\\/]/u).at(-1) ?? "session";
  return base.replace(/^rollout-/, "").replace(/\.jsonl$/u, "");
}

// src/convert/cursor.ts
function convertCursorSession(text, path, limits = DEFAULT_CONVERT_LIMITS) {
  return convertConversation(extractCursorConversation(text, path, limits), path, limits);
}
function extractCursorConversation(text, path, limits = DEFAULT_CONVERT_LIMITS) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return extractCursorJson(JSON.parse(trimmed), path, limits);
    } catch {
    }
  }
  return extractCursorJsonl(text, path, limits);
}
function extractCursorJson(value, path, limits) {
  if (Array.isArray(value)) {
    return conversationFromItems(value.map((item) => extractBubble(item, 0, limits)).filter((item) => item !== void 0), path);
  }
  if (!isRecord(value)) {
    return conversationFromItems([], path);
  }
  const bubbles = firstArray(value, [
    "fullConversationHeadersOnly",
    "conversation",
    "messages",
    "bubbles",
    "composerId"
  ]) ?? firstArrayDeep(value);
  const items = (bubbles ?? []).map((item) => extractBubble(item, parseTime(value.createdAt ?? value.created_at), limits)).filter((item) => item !== void 0);
  const nativeId = asString(value.composerId) ?? asString(value.composer_id) ?? asString(value.id) ?? idFromPath3(path);
  return {
    source: "cursor",
    nativeId,
    title: asString(value.name) ?? asString(value.title) ?? asString(value.text),
    cwd: asString(value.cwd) ?? asString(value.workspaceUri),
    createdAt: parseTime(value.createdAt ?? value.created_at),
    updatedAt: parseTime(value.lastUpdatedAt ?? value.updatedAt ?? value.updated_at),
    model: asString(value.modelName) ?? asString(value.model),
    provider: "cursor",
    items
  };
}
function extractCursorJsonl(text, path, limits) {
  const items = [];
  let nativeId = idFromPath3(path);
  let title;
  let cwd;
  let createdAt = 0;
  let updatedAt = 0;
  for (const raw of text.split(/\r?\n/u)) {
    if (raw.trim().length === 0) continue;
    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      continue;
    }
    const time = isRecord(record) ? parseTime(record.timestamp ?? record.createdAt, updatedAt) : 0;
    if (time > updatedAt) updatedAt = time;
    if (createdAt === 0 && time > 0) createdAt = time;
    if (isRecord(record)) {
      nativeId = asString(record.composerId) ?? asString(record.sessionId) ?? nativeId;
      title = asString(record.title) ?? title;
      cwd = asString(record.cwd) ?? cwd;
    }
    const item = extractBubble(record, time, limits);
    if (item !== void 0) items.push(item);
  }
  return {
    source: "cursor",
    nativeId,
    title,
    cwd,
    createdAt: createdAt || updatedAt,
    updatedAt: updatedAt || createdAt,
    provider: "cursor",
    items
  };
}
function extractBubble(value, fallbackTime, limits) {
  if (!isRecord(value)) return void 0;
  const time = parseTime(value.timestamp ?? value.createdAt ?? value.time, fallbackTime);
  const type = (asString(value.type) ?? asString(value.role) ?? "").toLowerCase();
  if (type === "tool_result" || type === "tool-result" || asString(value.toolCallId) !== void 0 && type.includes("result")) {
    const callId = asString(value.toolCallId) ?? asString(value.tool_call_id) ?? asString(value.callId);
    if (callId === void 0) return void 0;
    return {
      kind: "tool-result",
      time,
      callId,
      text: flattenText(value.result ?? value.content ?? value.text, limits),
      isError: value.isError === true || value.is_error === true
    };
  }
  if (type === "ai" || type === "assistant" || type === "1" || value.type === 2) {
    const toolCalls = extractCursorToolCalls(value);
    return {
      kind: "assistant",
      id: asString(value.bubbleId) ?? asString(value.id),
      time,
      text: flattenText(value.text ?? value.content ?? value.richText, limits),
      reasoning: flattenText(value.thinking ?? value.reasoning, limits),
      model: asString(value.modelType) ?? asString(value.model),
      provider: "cursor",
      toolCalls
    };
  }
  if (type === "user" || type === "human" || type === "0" || value.type === 1 || asString(value.text) !== void 0) {
    const text = flattenText(value.text ?? value.content ?? value.richText, limits);
    if (text.length === 0) return void 0;
    return {
      kind: "user",
      id: asString(value.bubbleId) ?? asString(value.id),
      time,
      text,
      source: "user"
    };
  }
  return void 0;
}
function extractCursorToolCalls(value) {
  const calls = [];
  const raw = value.toolFormerData ?? value.toolCalls ?? value.tool_calls;
  const list = Array.isArray(raw) ? raw : raw === void 0 ? [] : [raw];
  for (const item of list) {
    if (!isRecord(item)) continue;
    const callId = asString(item.toolCallId) ?? asString(item.id) ?? asString(item.callId);
    const name2 = asString(item.name) ?? asString(item.toolName) ?? asString(item.tool);
    if (callId === void 0 || name2 === void 0) continue;
    calls.push({
      callId,
      name: name2,
      arguments: encodeArguments(item.rawArgs ?? item.params ?? item.arguments ?? item.input)
    });
  }
  return calls;
}
function firstArray(value, keys) {
  for (const key of keys) {
    const field = value[key];
    if (Array.isArray(field)) return field;
  }
  return void 0;
}
function firstArrayDeep(value) {
  for (const nested of Object.values(value)) {
    if (!isRecord(nested)) continue;
    const found = firstArray(nested, ["fullConversationHeadersOnly", "conversation", "messages", "bubbles"]);
    if (found !== void 0) return found;
  }
  return void 0;
}
function conversationFromItems(items, path) {
  const first = items[0]?.time ?? 0;
  const last = items.at(-1)?.time ?? first;
  return {
    source: "cursor",
    nativeId: idFromPath3(path),
    createdAt: first,
    updatedAt: last,
    provider: "cursor",
    items
  };
}
function idFromPath3(path) {
  const base = path.split(/[\\/]/u).at(-1) ?? "session";
  return base.replace(/\.(jsonl|json)$/u, "");
}

// src/convert/grok.ts
function convertGrokSession(text, path, limits = DEFAULT_CONVERT_LIMITS, summary) {
  return convertConversation(extractGrokConversation(text, path, limits, summary), path, limits);
}
function parseGrokSummary(text) {
  let record;
  try {
    record = JSON.parse(text);
  } catch {
    return {};
  }
  if (!isRecord(record)) return {};
  const info = isRecord(record.info) ? record.info : {};
  const created = Date.parse(String(record.created_at ?? ""));
  const updated = Date.parse(String(record.updated_at ?? record.last_active_at ?? ""));
  return {
    id: asString(info.id) ?? asString(record.id),
    cwd: asString(info.cwd) ?? asString(record.cwd),
    title: asString(record.generated_title) ?? asString(record.session_summary) ?? asString(record.title),
    model: asString(record.current_model_id) ?? asString(record.model),
    createdAt: Number.isFinite(created) ? created : void 0,
    updatedAt: Number.isFinite(updated) ? updated : void 0
  };
}
function extractGrokConversation(text, path, limits = DEFAULT_CONVERT_LIMITS, summary = {}) {
  const items = [];
  let nativeId = summary.id ?? idFromPath4(path);
  let cwd = summary.cwd;
  let createdAt = summary.createdAt ?? 0;
  let updatedAt = summary.updatedAt ?? 0;
  let model = summary.model;
  let title = summary.title;
  const pending = /* @__PURE__ */ new Map();
  for (const raw of text.split(/\r?\n/u)) {
    if (raw.trim().length === 0) continue;
    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!isRecord(record)) continue;
    const time = grokTime(record, updatedAt);
    if (time > updatedAt) updatedAt = time;
    if (createdAt === 0 && time > 0) createdAt = time;
    if (record.method === "session/update" && isRecord(record.params) && isRecord(record.params.update)) {
      const update = record.params.update;
      const kind = asString(update.sessionUpdate);
      if (typeof record.params.sessionId === "string") nativeId = record.params.sessionId;
      if (kind === "user_message_chunk") {
        const textValue = chunkText(update.content, limits);
        if (textValue.length > 0) items.push({ kind: "user", time, text: textValue, source: "user" });
        continue;
      }
      if (kind === "agent_thought_chunk") {
        const textValue = chunkText(update.content, limits);
        if (textValue.length > 0) items.push({ kind: "assistant", time, text: "", reasoning: textValue, toolCalls: [] });
        continue;
      }
      if (kind === "agent_message_chunk") {
        const textValue = chunkText(update.content, limits);
        if (textValue.length > 0) items.push({ kind: "assistant", time, text: textValue, reasoning: "", toolCalls: [] });
        continue;
      }
      if (kind === "tool_call") {
        const callId = asString(update.toolCallId) ?? `grok-tool-${String(items.length)}`;
        const name2 = asString(update.title) ?? asString(update.kind) ?? "tool";
        const args = encodeGrokArgs(update.rawInput);
        pending.set(callId, { name: name2, args });
        items.push({
          kind: "assistant",
          time,
          text: "",
          reasoning: "",
          toolCalls: [{ callId, name: name2, arguments: args }]
        });
        continue;
      }
      if (kind === "tool_call_update" && asString(update.status) === "completed") {
        const callId = asString(update.toolCallId);
        if (callId === void 0) continue;
        pending.delete(callId);
        items.push({
          kind: "tool-result",
          time,
          callId,
          text: grokToolOutput(update.content, limits),
          isError: false
        });
      }
      continue;
    }
    const type = asString(record.type);
    if (type === "user") {
      const textValue = flattenText(record.content, limits);
      const query = extractUserQuery(textValue);
      if (query.length > 0) items.push({ kind: "user", time, text: query, source: "user" });
      continue;
    }
    if (type === "assistant") {
      const toolCalls = grokHistoryToolCalls(record.tool_calls);
      items.push({
        kind: "assistant",
        time,
        text: flattenText(record.content, limits),
        reasoning: "",
        toolCalls
      });
      continue;
    }
    if (type === "reasoning") {
      const textValue = flattenText(record.summary ?? record.content, limits);
      if (textValue.length > 0) items.push({ kind: "assistant", time, text: "", reasoning: textValue, toolCalls: [] });
      continue;
    }
    if (type === "tool_result") {
      const callId = asString(record.tool_call_id);
      if (callId === void 0) continue;
      items.push({
        kind: "tool-result",
        time,
        callId,
        text: flattenText(record.content, limits),
        isError: false
      });
    }
  }
  return {
    source: "grok",
    nativeId,
    title,
    cwd,
    createdAt: createdAt || updatedAt,
    updatedAt: updatedAt || createdAt,
    model,
    provider: "xai",
    items
  };
}
function grokTime(record, fallback) {
  if (typeof record.timestamp === "number") return parseTime(record.timestamp * (record.timestamp < 1e12 ? 1 : 1), fallback);
  if (isRecord(record.params) && isRecord(record.params.update) && isRecord(record.params.update._meta)) {
    return parseTime(record.params.update._meta.agentTimestampMs, fallback);
  }
  if (isRecord(record._meta)) return parseTime(record._meta.agentTimestampMs, fallback);
  return fallback;
}
function chunkText(value, limits) {
  if (isRecord(value)) return flattenText(value.text ?? value, limits);
  return flattenText(value, limits);
}
function grokToolOutput(value, limits) {
  if (!Array.isArray(value)) return flattenText(value, limits);
  const parts = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (isRecord(item.content)) parts.push(flattenText(item.content.text ?? item.content, limits));
    else parts.push(flattenText(item, limits));
  }
  return parts.filter((part) => part.length > 0).join("\n");
}
function grokHistoryToolCalls(value) {
  if (!Array.isArray(value)) return [];
  const calls = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const callId = asString(item.id);
    const name2 = asString(item.name);
    if (callId === void 0 || name2 === void 0) continue;
    calls.push({ callId, name: name2, arguments: encodeGrokArgs(item.arguments) });
  }
  return calls;
}
function encodeGrokArgs(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}
function extractUserQuery(text) {
  const match = /<user_query>\s*([\s\S]*?)\s*<\/user_query>/u.exec(text);
  return (match?.[1] ?? text).trim();
}
function idFromPath4(path) {
  const parts = path.replace(/\\/gu, "/").split("/");
  const file = parts.at(-1) ?? "session";
  if (file === "updates.jsonl" || file === "chat_history.jsonl") return parts.at(-2) ?? file;
  return file.replace(/\.(jsonl|json)$/u, "");
}

// src/convert/detect.ts
function detectSource(path, text) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized.includes("/.claude/projects/") || normalized.includes("/.claude/sessions/")) return "claude";
  if (normalized.includes("/.codex/sessions/") || /rollout-.*\.jsonl$/u.test(normalized)) return "codex";
  if (normalized.includes("/.cursor/") || normalized.includes("/User/workspaceStorage/") || normalized.includes("/Cursor/")) {
    return "cursor";
  }
  if (normalized.includes("/.grok/sessions/") || normalized.endsWith("/updates.jsonl")) return "grok";
  const first = firstRecord(text);
  if (first === void 0) return void 0;
  if (asString(first.sessionId) !== void 0 && (first.type === "user" || first.type === "assistant" || first.type === "mode")) {
    return "claude";
  }
  if (first.type === "session_meta" || first.type === "response_item" || first.type === "event_msg") return "codex";
  if (first.method === "session/update") return "grok";
  if (asString(first.composerId) !== void 0 || asString(first.bubbleId) !== void 0) return "cursor";
  if (Array.isArray(first.fullConversationHeadersOnly) || Array.isArray(first.bubbles)) return "cursor";
  return void 0;
}
function firstRecord(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed.split(/\r?\n/u)[0] ?? trimmed);
      return isRecord(parsed) ? parsed : void 0;
    } catch {
      return void 0;
    }
  }
  for (const line of trimmed.split(/\r?\n/u)) {
    if (line.trim().length === 0) continue;
    try {
      const parsed = JSON.parse(line);
      return isRecord(parsed) ? parsed : void 0;
    } catch {
      return void 0;
    }
  }
  return void 0;
}

// src/host/import.ts
async function convertFile(path, source, limits = DEFAULT_CONVERT_LIMITS) {
  const text = await readFile(path, "utf8");
  const detected = source ?? detectSource(path, text);
  if (detected === void 0) {
    throw new Error(`cannot detect conversation format: ${path}`);
  }
  if (detected === "claude") return convertClaudeSession(text, path, limits);
  if (detected === "codex") return convertCodexSession(text, path, limits);
  if (detected === "grok") {
    let summary;
    try {
      summary = parseGrokSummary(await readFile(join(dirname(path), "summary.json"), "utf8"));
    } catch {
      summary = void 0;
    }
    return convertGrokSession(text, path, limits, summary);
  }
  return convertCursorSession(text, path, limits);
}
function withWorkspaceCwd(converted, cwd) {
  if (cwd === void 0 || cwd.length === 0) return converted;
  return { ...converted, header: { ...converted.header, cwd } };
}
async function persistConverted(persistence, converted) {
  try {
    await persistence.create(converted.header);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already/i.test(message)) {
      return { ok: true, converted, alreadyImported: true };
    }
    return { ok: false, path: converted.path, message };
  }
  try {
    await persistence.append(converted.header.id, converted.events);
    return { ok: true, converted, alreadyImported: false };
  } catch (error) {
    return {
      ok: false,
      path: converted.path,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}
async function importDiscovered(persistence, row, limits = DEFAULT_CONVERT_LIMITS) {
  try {
    const converted = await convertFile(row.path, row.source, limits);
    return persistConverted(persistence, converted);
  } catch (error) {
    return {
      ok: false,
      path: row.path,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

// src/host/parse-args.ts
var SOURCES = /* @__PURE__ */ new Set(["claude", "codex", "cursor", "grok"]);
function parseImportArgs(rawInput) {
  const rawTokens = rawInput.trim().split(/\s+/u).filter((token) => token.length > 0);
  const keepCwd = !rawTokens.some((token) => token === "--here");
  const includeArchived = rawTokens.some((token) => token === "--archived");
  const tokens = rawTokens.filter((token) => token !== "--keep-cwd" && token !== "--archived" && token !== "--here");
  if (tokens.length === 0) return { kind: "help" };
  const first = tokens[0]?.toLowerCase();
  if (first === "help" || first === "--help") return { kind: "help" };
  if (first === "list") {
    const source2 = parseSource(tokens[1]);
    return source2 === void 0 && tokens[1] !== void 0 ? { kind: "sessions", query: tokens.slice(1).join(" "), keepCwd, includeArchived } : { kind: "list", source: source2, includeArchived };
  }
  if (first === "skills" || first === "skill") {
    return { kind: "skills", source: parseSource(tokens[1]) };
  }
  if (first === "memory" || first === "memories" || first === "agents") {
    return { kind: "memory" };
  }
  if (first === "automations" || first === "automation") {
    return { kind: "automations" };
  }
  if (first === "all") return { kind: "sessions", keepCwd, includeArchived };
  const source = parseSource(first);
  if (source !== void 0) {
    const query = tokens.slice(1).join(" ").trim();
    return query.length === 0 ? { kind: "sessions", source, keepCwd, includeArchived } : { kind: "sessions", source, query, keepCwd, includeArchived };
  }
  return { kind: "sessions", query: tokens.join(" "), keepCwd, includeArchived };
}
function parseSource(value) {
  if (value === void 0) return void 0;
  const normalized = value.toLowerCase();
  if (normalized === "claude-code") return "claude";
  return SOURCES.has(normalized) ? normalized : void 0;
}

// src/host/scan.ts
import { homedir } from "node:os";
import { basename, dirname as dirname2, join as join2 } from "node:path";
import { open, readdir, stat } from "node:fs/promises";
var DEFAULT_LIST_LIMIT = 300;
var PREVIEW_BYTES = 64e3;
var STAT_CONCURRENCY = 32;
var PREVIEW_CONCURRENCY = 16;
var DISCOVER_CACHE_MS = 3e4;
function defaultScanRoots(home = homedir(), includeArchived = false) {
  const codex = [join2(home, ".codex", "sessions")];
  if (includeArchived) codex.push(join2(home, ".codex", "archived_sessions"));
  return {
    claude: [
      join2(home, ".claude", "projects"),
      join2(home, ".claude", "sessions")
    ],
    codex,
    cursor: [
      join2(home, ".cursor", "projects"),
      join2(home, ".cursor", "chats"),
      join2(home, "Library", "Application Support", "Cursor", "User", "workspaceStorage"),
      join2(home, "AppData", "Roaming", "Cursor", "User", "workspaceStorage")
    ],
    grok: [
      join2(home, ".grok", "sessions")
    ]
  };
}
async function discoverSessions(roots, signal) {
  const found = [];
  await walk(roots.claude, "claude", found, signal);
  await walk(roots.codex, "codex", found, signal);
  await walk(roots.cursor, "cursor", found, signal);
  await walk(roots.grok, "grok", found, signal);
  found.sort((left, right) => right.updatedAt - left.updatedAt || left.path.localeCompare(right.path));
  return found;
}
function filterDiscovered(rows, maxFileBytes, query) {
  const needle = query?.trim().toLowerCase() ?? "";
  return rows.filter((row) => {
    if (row.bytes > maxFileBytes) return false;
    if (needle.length === 0) return true;
    return row.title.toLowerCase().includes(needle) || row.path.toLowerCase().includes(needle) || row.nativeId.toLowerCase().includes(needle);
  });
}
async function presentSessions(rows, options) {
  const filtered = filterDiscovered(rows, options.maxFileBytes, options.query).slice().sort((left, right) => right.updatedAt - left.updatedAt || left.path.localeCompare(right.path));
  const limit = options.limit ?? DEFAULT_LIST_LIMIT;
  const slice = filtered.slice(0, Math.max(0, limit));
  const read = options.readPreview ?? readPreview;
  const entries = new Array(slice.length);
  await mapLimit(slice, PREVIEW_CONCURRENCY, async (row, index) => {
    options.signal?.throwIfAborted();
    try {
      const preview = row.source === "grok" ? await readGrokPreview(row.path, read) : await read(row.path);
      entries[index] = enrichFromPreview(row, preview);
    } catch {
      entries[index] = row;
    }
  });
  return { entries, total: filtered.length };
}
async function readGrokPreview(path, read) {
  try {
    return await read(join2(dirname2(path), "summary.json"));
  } catch {
    return read(path);
  }
}
async function readPreview(path, maxBytes = PREVIEW_BYTES) {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(Math.max(1, maxBytes));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.toString("utf8", 0, bytesRead);
  } finally {
    await handle.close();
  }
}
async function walk(roots, source, found, signal) {
  for (const root of roots) {
    signal?.throwIfAborted();
    await visit(root, source, found, 0, signal);
  }
}
async function visit(path, source, found, depth, signal) {
  if (depth > 8) return;
  signal?.throwIfAborted();
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch {
    return;
  }
  const files = [];
  const directories = [];
  for (const entry of entries) {
    const full = join2(path, entry.name);
    if (entry.isDirectory()) directories.push(full);
    else if (entry.isFile() && isSessionFile(source, entry.name)) files.push(full);
  }
  await mapLimit(files, STAT_CONCURRENCY, async (full) => {
    signal?.throwIfAborted();
    let info;
    try {
      info = await stat(full);
    } catch {
      return;
    }
    const nativeId = source === "grok" ? grokNativeIdFromPath(full) : nativeIdFromName(source, basename(full));
    found.push({
      source,
      nativeId,
      path: full,
      title: fallbackTitle(nativeId),
      createdAt: Math.round(info.birthtimeMs || info.mtimeMs),
      updatedAt: Math.round(info.mtimeMs),
      bytes: info.size
    });
  });
  for (const directory of directories) {
    await visit(directory, source, found, depth + 1, signal);
  }
}
async function mapLimit(items, limit, fn) {
  if (items.length === 0) return;
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}
function isSessionFile(source, name2) {
  const lower = name2.toLowerCase();
  if (source === "claude") return lower.endsWith(".jsonl");
  if (source === "codex") return lower.endsWith(".jsonl") && (lower.startsWith("rollout-") || lower.includes("session"));
  if (source === "grok") return lower === "updates.jsonl";
  return lower.endsWith(".jsonl") || lower.endsWith(".json") && /composer|transcript|chat|conversation/u.test(lower);
}
function nativeIdFromName(source, name2) {
  const bare = name2.replace(/\.(jsonl|json)$/u, "");
  if (source === "codex") return bare.replace(/^rollout-\d{4}-\d{2}-\d{2}T[0-9-]+-/, "");
  return bare;
}
function grokNativeIdFromPath(path) {
  const parts = path.replace(/\\/gu, "/").split("/");
  const file = parts.at(-1) ?? "session";
  if (file === "updates.jsonl" || file === "chat_history.jsonl") return parts.at(-2) ?? file;
  return file.replace(/\.(jsonl|json)$/u, "");
}
function enrichFromPreview(row, text) {
  const head = text.slice(0, PREVIEW_BYTES);
  let title = row.source === "grok" && row.nativeId === "updates" ? grokNativeIdFromPath(row.path) : row.title;
  let cwd = row.cwd;
  let nativeId = row.source === "grok" && row.nativeId === "updates" ? grokNativeIdFromPath(row.path) : row.nativeId;
  let createdAt = row.createdAt;
  const whole = parsePreviewObject(head);
  if (whole !== void 0) {
    if (typeof whole.generated_title === "string") title = whole.generated_title;
    else if (typeof whole.session_summary === "string") title = whole.session_summary;
    if (isRecord(whole.info)) {
      if (typeof whole.info.id === "string") nativeId = whole.info.id;
      if (typeof whole.info.cwd === "string") cwd = whole.info.cwd;
    }
  }
  for (const line of head.split(/\r?\n/u).slice(0, 40)) {
    if (line.trim().length === 0) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRecord(record)) continue;
    if (typeof record.sessionId === "string") nativeId = record.sessionId;
    if (typeof record.cwd === "string") cwd = record.cwd;
    if (typeof record.aiTitle === "string") title = record.aiTitle;
    if (typeof record.timestamp === "string") {
      const parsed = Date.parse(record.timestamp);
      if (Number.isFinite(parsed) && (createdAt === row.createdAt || parsed < createdAt)) createdAt = parsed;
    }
    const payload = isRecord(record.payload) ? record.payload : void 0;
    if (record.type === "session_meta" && payload !== void 0) {
      if (typeof payload.id === "string") nativeId = payload.id;
      if (typeof payload.cwd === "string") cwd = payload.cwd;
      if (typeof payload.thread_name === "string") title = payload.thread_name;
    }
    if (record.type === "user" && isRecord(record.message) && typeof record.message.content === "string" && title === row.title) {
      title = fallbackTitle(record.message.content);
    }
    if (record.method === "session/update" && isRecord(record.params) && isRecord(record.params.update)) {
      const update = record.params.update;
      if (update.sessionUpdate === "user_message_chunk" && title === row.title) {
        const content = isRecord(update.content) && typeof update.content.text === "string" ? update.content.text : "";
        if (content.length > 0) title = fallbackTitle(content);
      }
    }
    if (typeof record.generated_title === "string") title = record.generated_title;
    if (isRecord(record.info) && typeof record.info.cwd === "string") cwd = record.info.cwd;
  }
  return { ...row, nativeId, title, cwd, createdAt };
}
function parsePreviewObject(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return void 0;
  try {
    const parsed = JSON.parse(trimmed);
    return isRecord(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}

// src/host/skills.ts
import { mkdir, readFile as readFile2, writeFile } from "node:fs/promises";
import { basename as basename2, dirname as dirname3, join as join3 } from "node:path";
import { homedir as homedir2 } from "node:os";
function defaultSkillRoots(home = homedir2()) {
  return {
    claude: [
      join3(home, ".claude", "skills"),
      join3(home, ".claude", "commands")
    ],
    codex: [
      join3(home, ".codex", "skills")
    ],
    cursor: [
      join3(home, ".cursor", "skills"),
      join3(home, ".cursor", "commands")
    ]
  };
}
async function discoverSkills(roots, signal) {
  const found = [];
  for (const source of ["claude", "codex", "cursor"]) {
    for (const root of roots[source]) {
      signal?.throwIfAborted();
      await visitSkillRoot(root, source, found);
    }
  }
  found.sort((left, right) => left.name.localeCompare(right.name) || left.path.localeCompare(right.path));
  return found;
}
async function copySkill(skill, targetRoot) {
  const directory = join3(targetRoot, skill.name);
  const target = join3(directory, "SKILL.md");
  await mkdir(directory, { recursive: true });
  let overwritten = false;
  try {
    await readFile2(target);
    overwritten = true;
  } catch {
    overwritten = false;
  }
  const body = ensureFrontmatter(skill);
  await writeFile(target, body, "utf8");
  return { path: target, overwritten };
}
async function visitSkillRoot(root, source, found) {
  const { readdir: readdir3, readFile: readFile4, stat: stat3 } = await import("node:fs/promises");
  let entries;
  try {
    entries = await readdir3(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join3(root, entry.name);
    if (entry.isDirectory()) {
      const skillFile = join3(full, "SKILL.md");
      try {
        const info = await stat3(skillFile);
        if (!info.isFile()) continue;
        const parsed = parseSkillFile(await readFile4(skillFile, "utf8"), source, skillFile);
        if (parsed !== void 0) found.push(parsed);
      } catch {
        continue;
      }
      continue;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
    if (entry.name.toLowerCase() === "readme.md") continue;
    try {
      const parsed = parseSkillFile(await readFile4(full, "utf8"), source, full);
      if (parsed !== void 0) found.push(parsed);
    } catch {
      continue;
    }
  }
}
function parseSkillFile(text, source, path) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/u.exec(text);
  const front = match?.[1] ?? "";
  const body = (match?.[2] ?? text).trim();
  const fields = parseFrontmatter(front);
  const fromFile = kebabName(path.endsWith("SKILL.md") ? basename2(dirname3(path)) : basename2(path));
  const name2 = kebabName(String(fields.name ?? "")) ?? fromFile;
  if (name2 === void 0) return void 0;
  const description = String(fields.description ?? firstHeading(body) ?? name2);
  return {
    source,
    name: name2,
    description,
    path,
    content: body.length === 0 ? text : body
  };
}
function ensureFrontmatter(skill) {
  if (skill.content.startsWith("---")) {
    return skill.content.endsWith("\n") ? skill.content : `${skill.content}
`;
  }
  return [
    "---",
    `name: ${skill.name}`,
    `description: ${JSON.stringify(skill.description)}`,
    "---",
    "",
    skill.content.trim(),
    ""
  ].join("\n");
}
function parseFrontmatter(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/u)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/u.exec(line);
    if (match === null) continue;
    const key = match[1];
    let value = (match[2] ?? "").trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    if (key !== void 0) fields[key] = value;
  }
  return fields;
}
function firstHeading(body) {
  const match = /^#\s+(.+)$/mu.exec(body);
  return match?.[1]?.trim();
}

// src/host/compat.ts
import { homedir as homedir3 } from "node:os";
import { basename as basename3, dirname as dirname4, join as join4 } from "node:path";
import { mkdir as mkdir2, readFile as readFile3, readdir as readdir2, stat as stat2, writeFile as writeFile2 } from "node:fs/promises";
var WEEKDAY_TO_ISO = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7
};
function defaultMemoryRoots(home = homedir3()) {
  return [
    { source: "claude", kind: "agents", path: join4(home, ".claude", "CLAUDE.md"), name: "claude-claude-md" },
    { source: "codex", kind: "agents", path: join4(home, ".codex", "AGENTS.md"), name: "codex-agents-md" },
    { source: "codex", kind: "memory", path: join4(home, ".codex", "memories", "MEMORY.md"), name: "codex-memory" },
    { source: "codex", kind: "memory", path: join4(home, ".codex", "memories", "memory_summary.md"), name: "codex-memory-summary" }
  ];
}
async function discoverMemories(home = homedir3()) {
  const found = [];
  for (const root of defaultMemoryRoots(home)) {
    let info;
    try {
      info = await stat2(root.path);
    } catch {
      continue;
    }
    if (!info.isFile()) continue;
    let text = "";
    try {
      text = await readFile3(root.path, "utf8");
    } catch {
      continue;
    }
    found.push({
      source: root.source,
      kind: root.kind,
      name: root.name,
      path: root.path,
      bytes: info.size,
      preview: firstPreview(text)
    });
  }
  return found;
}
async function importMemories(paths, home = homedir3()) {
  const targetRoot = join4(home, ".dsh", "imported-memory");
  await mkdir2(targetRoot, { recursive: true });
  let copied = 0;
  let merged = 0;
  const failed = [];
  const known = await discoverMemories(home);
  const selected = paths.length === 0 ? known : known.filter((row) => paths.includes(row.path));
  for (const row of selected) {
    try {
      const text = await readFile3(row.path, "utf8");
      const dest = join4(targetRoot, `${row.name}.md`);
      await writeFile2(dest, ensureTrailingNewline(text), "utf8");
      copied += 1;
      if (row.kind === "agents") {
        await mergeAgentsFile(join4(home, ".dsh", "AGENTS.md"), row.path, text);
        merged += 1;
      }
    } catch (error) {
      failed.push({ path: row.path, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { copied, merged, failed };
}
async function discoverAutomations(home = homedir3()) {
  const root = join4(home, ".codex", "automations");
  let entries;
  try {
    entries = await readdir2(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const path = join4(root, entry.name, "automation.toml");
    try {
      const text = await readFile3(path, "utf8");
      const parsed = parseAutomationToml(text, path);
      if (parsed !== void 0) found.push(parsed);
    } catch {
      continue;
    }
  }
  found.sort((left, right) => left.name.localeCompare(right.name) || left.path.localeCompare(right.path));
  return found;
}
function parseAutomationToml(text, path) {
  const fields = parseSimpleToml(text);
  const nativeId = String(fields.id ?? basename3(dirname4(path)));
  const name2 = String(fields.name ?? nativeId);
  const prompt = String(fields.prompt ?? "");
  if (prompt.trim().length === 0) return void 0;
  const rrule = typeof fields.rrule === "string" ? fields.rrule : void 0;
  const cwd = firstCwd(fields.cwds);
  return {
    source: "codex",
    nativeId,
    name: name2,
    path,
    status: String(fields.status ?? "UNKNOWN"),
    cwd,
    rrule,
    prompt,
    schedule: mapRrule(rrule)
  };
}
function mapRrule(rrule, timeZone = "Asia/Shanghai") {
  if (rrule === void 0 || rrule.trim().length === 0) {
    return { kind: "unsupported", reason: "missing RRULE" };
  }
  const body = rrule.replace(/^RRULE:/u, "");
  const parts = Object.fromEntries(
    body.split(";").map((part) => {
      const [rawKey, rawValue = ""] = part.split("=");
      return [rawKey.toUpperCase(), rawValue];
    })
  );
  const freq = parts.FREQ;
  const interval = Number.parseInt(parts.INTERVAL ?? "1", 10);
  if (freq === "MINUTELY" && Number.isSafeInteger(interval) && interval > 0) {
    const everySeconds = interval * 60;
    if (everySeconds < 300) return { kind: "unsupported", reason: `interval ${String(everySeconds)}s is below DSH minEverySeconds=300` };
    return { kind: "every", everySeconds };
  }
  if (freq === "HOURLY" && Number.isSafeInteger(interval) && interval > 0) {
    return { kind: "every", everySeconds: interval * 3600 };
  }
  if (freq === "DAILY" || freq === "WEEKLY") {
    const hour = clampInt(parts.BYHOUR, 0, 23, 2);
    const minute = clampInt(parts.BYMINUTE, 0, 59, 0);
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const weekdays = parseWeekdays(parts.BYDAY);
    if (freq === "DAILY" && (parts.INTERVAL === void 0 || parts.INTERVAL === "1") && weekdays === void 0) {
      return { kind: "local-clock", time, timeZone };
    }
    if (freq === "WEEKLY" && (parts.INTERVAL === void 0 || parts.INTERVAL === "1")) {
      return { kind: "local-clock", time, ...weekdays === void 0 ? {} : { weekdays }, timeZone };
    }
  }
  return { kind: "unsupported", reason: `unsupported RRULE ${rrule}` };
}
function parseWeekdays(raw) {
  if (raw === void 0 || raw.length === 0) return void 0;
  const days = [...new Set(
    raw.split(",").map((token) => WEEKDAY_TO_ISO[token.replace(/^-?\d+/u, "").toUpperCase()]).filter((day) => day !== void 0)
  )].sort((left, right) => left - right);
  if (days.length === 0) return void 0;
  if (days.length === 7) return void 0;
  return days;
}
function clampInt(raw, min, max, fallback) {
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isSafeInteger(value) || value < min || value > max) return fallback;
  return value;
}
function firstCwd(value) {
  if (typeof value === "string" && value.startsWith("/")) return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.startsWith("/"));
    return first;
  }
  return void 0;
}
function firstPreview(text) {
  const line = text.replace(/\s+/gu, " ").trim();
  return line.length <= 160 ? line : `${line.slice(0, 159)}\u2026`;
}
function ensureTrailingNewline(text) {
  return text.endsWith("\n") ? text : `${text}
`;
}
async function mergeAgentsFile(target, sourcePath, text) {
  await mkdir2(dirname4(target), { recursive: true });
  let existing = "";
  try {
    existing = await readFile3(target, "utf8");
  } catch {
    existing = "";
  }
  const marker = `<!-- imported-from ${sourcePath} -->`;
  if (existing.includes(marker)) return;
  const block = `${existing.trimEnd()}${existing.trim().length === 0 ? "" : "\n\n"}${marker}
${text.trimEnd()}
`;
  await writeFile2(target, block, "utf8");
}
function parseSimpleToml(text) {
  const fields = {};
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#") || line.startsWith("[")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    fields[key] = decodeTomlValue(line.slice(eq + 1).trim());
  }
  return fields;
}
function decodeTomlValue(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/u.test(raw)) return Number(raw);
  if (raw.startsWith('"') && raw.endsWith('"')) return unescapeTomlString(raw.slice(1, -1));
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (inner.length === 0) return [];
    return inner.split(",").map((part) => decodeTomlValue(part.trim()));
  }
  if (raw.startsWith("{") && raw.endsWith("}")) return raw;
  return raw;
}
function unescapeTomlString(value) {
  return value.replace(/\\n/gu, "\n").replace(/\\t/gu, "	").replace(/\\"/gu, '"').replace(/\\\\/gu, "\\");
}

// src/host/workspace.ts
import { basename as basename4 } from "node:path";
import { mkdir as mkdir3 } from "node:fs/promises";
async function ensureWorkspace(registry, cwd) {
  if (registry === void 0 || cwd === void 0 || cwd.length === 0) return registry?.list?.()[0];
  try {
    const existing = await registry.resolveByPath?.(cwd);
    if (existing !== void 0) return existing;
  } catch {
  }
  try {
    await mkdir3(cwd, { recursive: true });
  } catch {
    return registry.list?.()[0];
  }
  try {
    return await registry.create?.(cwd, basename4(cwd)) ?? registry.list?.()[0];
  } catch {
    try {
      return await registry.resolveByPath?.(cwd);
    } catch {
      return registry.list?.()[0];
    }
  }
}

// src/host/index.ts
var name = "session-import";
var SESSION_IMPORT_SETTINGS_NAMESPACE = "session-import";
var SETTINGS_NS = settingsNamespace(SESSION_IMPORT_SETTINGS_NAMESPACE);
var CHANNEL = "/session-import";
function apply(ctx, config = {}) {
  const limits = {
    maxToolResultChars: config.maxToolResultChars ?? DEFAULT_CONVERT_LIMITS.maxToolResultChars,
    maxTextChars: config.maxTextChars ?? DEFAULT_CONVERT_LIMITS.maxTextChars
  };
  const maxFileBytes = config.maxFileBytes ?? 32 * 1024 * 1024;
  const skillTarget = config.skillTarget ?? join5(homedir4(), ".dsh", "skills");
  ctx.inject(["settings"], (settingsCtx) => {
    const settings = settingsCtx.get("settings");
    settings.register(SETTINGS_NS, z.object({
      lastImportAt: z.number().default(0)
    }), { base: { lastImportAt: 0 } });
  });
  ctx.inject(["commands"], (commandCtx) => {
    commandCtx.commands.register({
      name: "import",
      description: "Import Cursor, Codex, or Claude Code sessions and skills",
      input: { hint: "[list|all|skills|memory|automations|claude|codex|cursor|path]" },
      handler: (invocation) => handleImportCommand(commandCtx, invocation.rawInput, {
        limits,
        maxFileBytes,
        skillTarget,
        signal: invocation.signal,
        workspaceCwd: invocation.agent.session.header.cwd
      })
    });
  });
  ctx.inject(["connection"], (connectionCtx) => {
    connectionCtx.connection.rpc.handle(CHANNEL, async (endpoint, payload) => {
      try {
        switch (endpoint) {
          case "listSessions":
            return { ok: true, value: await listSessions(payload, maxFileBytes) };
          case "importSessions":
            return { ok: true, value: await importSessions(connectionCtx, payload, limits, maxFileBytes) };
          case "importOneSession":
            return { ok: true, value: await importOneSession(connectionCtx, payload, limits, maxFileBytes) };
          case "listSkills":
            return { ok: true, value: { entries: await discoverSkills(defaultSkillRoots()) } };
          case "importSkills":
            return { ok: true, value: await importSkills(payload, skillTarget) };
          case "listMemories":
            return { ok: true, value: { entries: await discoverMemories() } };
          case "importMemories":
            return { ok: true, value: await importMemories(payload.paths ?? []) };
          case "listAutomations":
            return { ok: true, value: { entries: await discoverAutomations() } };
          case "importAutomations":
            return { ok: true, value: await importAutomations(connectionCtx, payload) };
          default:
            return { ok: false, error: { code: "NOT_FOUND", message: "unknown session-import endpoint" } };
        }
      } catch (error) {
        return {
          ok: false,
          error: { code: "INTERNAL", message: error instanceof Error ? error.message : String(error) }
        };
      }
    }, { authority: "loopback" });
  });
}
async function handleImportCommand(ctx, rawInput, runtime) {
  const command = parseImportArgs(rawInput);
  if (command.kind === "help") {
    return {
      kind: "success",
      text: [
        "Import foreign agent conversations into this Harness.",
        "/import list [claude|codex|cursor|grok] \u2014 discover local sessions",
        "/import all \u2014 import every discovered session into this workspace",
        "/import claude|codex|cursor|grok \u2014 import one store",
        "/import skills \u2014 copy Claude/Codex/Cursor skills into ~/.dsh/skills",
        "/import memory \u2014 copy Claude/Codex instruction files into ~/.dsh/AGENTS.md",
        "/import automations \u2014 create DSH timers from ~/.codex/automations",
        "/import <path-or-id> \u2014 import one file or native id",
        "Imports keep the foreign working directory and create a DSH workspace when it is missing.",
        "Add --here to rewrite imported sessions into the current workspace instead.",
        "Add --archived to include ~/.codex/archived_sessions."
      ].join("\n")
    };
  }
  if (command.kind === "list") {
    const listed = await listedSessions(command.source, runtime.maxFileBytes, {
      signal: runtime.signal,
      limit: 40,
      includeArchived: command.includeArchived
    });
    if (listed.total === 0) return { kind: "success", text: "No foreign sessions found." };
    const lines = listed.entries.map((row) => `${row.source}	${row.title}	${row.nativeId}	${row.path}`);
    const extra = listed.total > listed.entries.length ? `
\u2026 ${String(listed.total - listed.entries.length)} more` : "";
    return { kind: "success", text: `Found ${String(listed.total)} session(s).
${lines.join("\n")}${extra}` };
  }
  if (command.kind === "skills") {
    const skills = await discoverSkills(defaultSkillRoots(), runtime.signal);
    const selected2 = command.source === void 0 ? skills : skills.filter((skill) => skill.source === command.source);
    if (selected2.length === 0) return { kind: "success", text: "No foreign skills found." };
    let copied = 0;
    let overwritten = 0;
    for (const skill of selected2) {
      const result = await copySkill(skill, runtime.skillTarget);
      copied += 1;
      if (result.overwritten) overwritten += 1;
    }
    return {
      kind: "success",
      text: `Copied ${String(copied)} skill(s) to ${runtime.skillTarget}${overwritten > 0 ? ` (${String(overwritten)} overwritten)` : ""}.`
    };
  }
  if (command.kind === "memory") {
    const result = await importMemories([]);
    return {
      kind: result.failed.length > 0 && result.copied === 0 ? "error" : "success",
      text: `Copied ${String(result.copied)} memory file(s), merged ${String(result.merged)} into ~/.dsh/AGENTS.md${result.failed.length > 0 ? `, failed ${String(result.failed.length)}` : ""}.`
    };
  }
  if (command.kind === "automations") {
    const result = await importAutomations(ctx, {});
    return {
      kind: result.failed.length > 0 && result.imported === 0 ? "error" : "success",
      text: `Imported ${String(result.imported)} automation(s), skipped ${String(result.skipped)}, unsupported ${String(result.unsupported)}, failed ${String(result.failed.length)}.`
    };
  }
  const persistence = requirePersistence(ctx);
  if (persistence === void 0) {
    return { kind: "error", text: "session persistence is not configured; cannot import conversations." };
  }
  const query = command.query;
  if (query !== void 0 && looksLikePath(query)) {
    runtime.signal.throwIfAborted();
    try {
      const converted = relocate(await convertFile(expandHome(query), command.source, runtime.limits), runtime.workspaceCwd, command.keepCwd);
      const outcome = await persistConverted(persistence, converted);
      if (!outcome.ok) return { kind: "error", text: outcome.message };
      return {
        kind: "success",
        text: outcome.alreadyImported ? `Already imported as ${converted.header.id}.` : `Imported ${converted.title} as ${converted.header.id}.`
      };
    } catch (error) {
      return { kind: "error", text: error instanceof Error ? error.message : String(error) };
    }
  }
  const selected = await matchingSessions(command.source, runtime.maxFileBytes, query, runtime.signal, command.includeArchived);
  if (selected.length === 0) return { kind: "error", text: "No matching foreign sessions." };
  let imported = 0;
  let skipped = 0;
  const failures = [];
  for (const row of selected) {
    runtime.signal.throwIfAborted();
    const outcome = await importOne(persistence, row, runtime.limits, runtime.workspaceCwd, command.keepCwd);
    if (!outcome.ok) {
      failures.push(`${row.path}: ${outcome.message}`);
      continue;
    }
    if (outcome.alreadyImported) skipped += 1;
    else imported += 1;
    await settleImported(ctx, outcome.converted.header.id, outcome.converted.header.cwd, outcome.converted.title);
  }
  const failed = failures.length === 0 ? "" : `
Failed:
${failures.slice(0, 8).join("\n")}`;
  return {
    kind: failures.length > 0 && imported === 0 ? "error" : "success",
    text: `Imported ${String(imported)}, already present ${String(skipped)}, failed ${String(failures.length)}.${failed}`
  };
}
var discoverCache = /* @__PURE__ */ new Map();
function rootsFor(source, includeArchived = false) {
  const roots = defaultScanRoots(void 0, includeArchived);
  if (source === void 0) return roots;
  return {
    claude: source === "claude" ? roots.claude : [],
    codex: source === "codex" ? roots.codex : [],
    cursor: source === "cursor" ? roots.cursor : [],
    grok: source === "grok" ? roots.grok : []
  };
}
async function discoveredSessions(source, signal, includeArchived = false) {
  const roots = rootsFor(source, includeArchived);
  const key = [...roots.claude, ...roots.codex, ...roots.cursor].join("|");
  const now = Date.now();
  const cached = discoverCache.get(key);
  if (cached !== void 0 && cached.expiresAt > now) return cached.rows;
  const rows = discoverSessions(roots, signal);
  discoverCache.set(key, { expiresAt: now + DISCOVER_CACHE_MS, rows });
  try {
    return await rows;
  } catch (error) {
    discoverCache.delete(key);
    throw error;
  }
}
async function listedSessions(source, maxFileBytes, options = {}) {
  return presentSessions(await discoveredSessions(source, options.signal, options.includeArchived === true), {
    maxFileBytes,
    query: options.query,
    limit: options.limit,
    signal: options.signal
  });
}
async function matchingSessions(source, maxFileBytes, query, signal, includeArchived = false) {
  return filterDiscovered(await discoveredSessions(source, signal, includeArchived), maxFileBytes, query);
}
async function listSessions(request, maxFileBytes) {
  return listedSessions(request.source, maxFileBytes, {
    query: request.query,
    limit: request.limit ?? DEFAULT_LIST_LIMIT,
    includeArchived: request.includeArchived === true
  });
}
async function importSessions(ctx, request, limits, maxFileBytes) {
  const persistence = requirePersistence(ctx);
  if (persistence === void 0) {
    throw new Error("session persistence is not configured");
  }
  const rows = await matchingSessions(request.source, maxFileBytes, void 0, void 0, request.includeArchived === true);
  const selected = request.paths === void 0 || request.paths.length === 0 ? rows : rows.filter((row) => request.paths.includes(row.path));
  let imported = 0;
  let skipped = 0;
  const failed = [];
  for (const row of selected) {
    const outcome = await importOne(persistence, row, limits, workspaceCwdOf(ctx), request.keepCwd !== false);
    if (!outcome.ok) {
      failed.push({ path: row.path, message: outcome.message });
      continue;
    }
    if (outcome.alreadyImported) skipped += 1;
    else imported += 1;
    await settleImported(ctx, outcome.converted.header.id, outcome.converted.header.cwd, outcome.converted.title);
  }
  if (request.paths !== void 0) {
    for (const path of request.paths) {
      if (selected.some((row) => row.path === path)) continue;
      try {
        const converted = relocate(await convertFile(path, request.source, limits), workspaceCwdOf(ctx), request.keepCwd !== false);
        const outcome = await persistConverted(persistence, converted);
        if (!outcome.ok) failed.push({ path, message: outcome.message });
        else {
          if (outcome.alreadyImported) skipped += 1;
          else imported += 1;
          await settleImported(ctx, outcome.converted.header.id, outcome.converted.header.cwd, outcome.converted.title);
        }
      } catch (error) {
        failed.push({ path, message: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  return { imported, skipped, failed };
}
async function importOneSession(ctx, request, limits, maxFileBytes) {
  const path = request.path?.trim() ?? "";
  if (path.length === 0) throw new Error("importOneSession requires path");
  const result = await importSessions(ctx, {
    paths: [path],
    source: request.source,
    keepCwd: request.keepCwd
  }, limits, maxFileBytes);
  return result;
}
async function importSkills(request, skillTarget) {
  const skills = await discoverSkills(defaultSkillRoots());
  const selected = request.paths === void 0 || request.paths.length === 0 ? skills : skills.filter((skill) => request.paths.includes(skill.path));
  let copied = 0;
  let overwritten = 0;
  const failed = [];
  for (const skill of selected) {
    try {
      const result = await copySkill(skill, skillTarget);
      copied += 1;
      if (result.overwritten) overwritten += 1;
    } catch (error) {
      failed.push({ path: skill.path, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { copied, overwritten, failed };
}
function relocate(converted, workspaceCwd, keepCwd) {
  return keepCwd ? converted : withWorkspaceCwd(converted, workspaceCwd);
}
async function importOne(persistence, row, limits, workspaceCwd, keepCwd) {
  if (keepCwd) return importDiscovered(persistence, row, limits);
  const converted = relocate(await convertFile(row.path, row.source, limits), workspaceCwd, false);
  return persistConverted(persistence, converted);
}
function looksLikePath(value) {
  return value.startsWith("/") || value.startsWith("~") || /^[A-Za-z]:[\\/]/u.test(value);
}
function expandHome(value) {
  if (value === "~") return homedir4();
  if (value.startsWith("~/")) return join5(homedir4(), value.slice(2));
  return value;
}
function requirePersistence(ctx) {
  return ctx.get("sessionPersistence");
}
function workspaceCwdOf(ctx) {
  const live = ctx.get("sessions");
  for (const session of live?.list?.() ?? []) {
    if (typeof session.header?.cwd === "string" && session.header.cwd.length > 0) return session.header.cwd;
  }
  return process.cwd();
}
async function importAutomations(ctx, request) {
  const automation = ctx.get("automation");
  if (automation?.create === void 0 || automation.list === void 0) {
    throw new Error("automation service is not configured");
  }
  const workspace = ctx.get("workspaceRegistry");
  const rows = await discoverAutomations();
  const selected = request.paths === void 0 || request.paths.length === 0 ? rows : rows.filter((row) => request.paths.includes(row.path));
  const existing = new Set(automation.list().map((rule) => `${rule.name ?? ""}\0${rule.task ?? ""}`));
  let imported = 0;
  let skipped = 0;
  let unsupported = 0;
  const failed = [];
  for (const row of selected) {
    if (row.schedule.kind === "unsupported") {
      unsupported += 1;
      failed.push({ path: row.path, message: row.schedule.reason });
      continue;
    }
    if (existing.has(`${row.name}\0${row.prompt}`)) {
      skipped += 1;
      continue;
    }
    try {
      const workspaceId = await resolveWorkspaceId(workspace, row.cwd, workspaceCwdOf(ctx));
      if (workspaceId === void 0) {
        failed.push({ path: row.path, message: "no DSH workspace available for this automation" });
        continue;
      }
      const created = row.schedule.kind === "every" ? await automation.create({
        name: row.name,
        task: row.prompt,
        workspaceId,
        enabled: row.status.toUpperCase() === "ACTIVE",
        everySeconds: row.schedule.everySeconds
      }) : await automation.create({
        name: row.name,
        task: row.prompt,
        workspaceId,
        enabled: row.status.toUpperCase() === "ACTIVE",
        localClock: {
          time: row.schedule.time,
          ...row.schedule.weekdays === void 0 ? {} : { weekdays: row.schedule.weekdays },
          time_zone: row.schedule.timeZone
        }
      });
      if (created === void 0) failed.push({ path: row.path, message: "automation.create returned nothing" });
      else imported += 1;
    } catch (error) {
      failed.push({ path: row.path, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { imported, skipped, unsupported, failed };
}
async function resolveWorkspaceId(registry, cwd, fallbackCwd) {
  const workspace = await ensureWorkspace(registry, cwd ?? fallbackCwd);
  return workspace?.id ?? registry?.list?.()[0]?.id;
}
async function settleImported(ctx, id, cwd, title) {
  await warmProjection(ctx, id);
  await attachImported(ctx, id, cwd);
  await publishTitle(ctx, id, title);
}
async function warmProjection(ctx, id) {
  const cache = ctx.get("sessionProjectionCache");
  if (cache?.coldSnapshot === void 0) return;
  try {
    await cache.coldSnapshot(id);
  } catch {
  }
}
async function attachImported(ctx, id, cwd) {
  const registry = ctx.get("workspaceRegistry");
  if (registry === void 0) return;
  try {
    const workspace = await ensureWorkspace(registry, cwd ?? workspaceCwdOf(ctx));
    await workspace?.attachSession?.(id);
  } catch {
  }
}
async function publishTitle(ctx, id, title) {
  const name2 = title?.trim();
  if (name2 === void 0 || name2.length === 0) return;
  const persistence = ctx.get("sessionPersistence");
  const titles = ctx.get("sessionTitle");
  if (persistence?.prepare === void 0 || titles?.rename === void 0) return;
  try {
    const prepared = await persistence.prepare(id);
    const published = await prepared.publish?.();
    const session = published?.session ?? ctx.get("sessions")?.get?.(id);
    if (session !== void 0) titles.rename(session, name2);
  } catch {
  }
}
export {
  SESSION_IMPORT_SETTINGS_NAMESPACE,
  apply,
  name
};
