// src/host.ts
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// src/logic.ts
var DEFAULT_MAX_STAGE_BYTES = 8 * 1024 * 1024;
function basename(path) {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path;
}
function safeDroppedName(name2) {
  const base = basename(name2);
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+$/g, "_");
  if (cleaned.length === 0) return "dropped.bin";
  return cleaned.slice(0, 120);
}

// src/host.ts
var name = "file-drop";
var CHANNEL = "/file-drop";
function defaultStageDir() {
  return join(homedir(), ".dsh", "dropped");
}
async function stageDroppedFile(payload, options) {
  const data = payload.data;
  if (typeof data !== "string" || data.length === 0) {
    throw new Error("file-drop.stage: missing data");
  }
  let bytes;
  try {
    bytes = Buffer.from(data, "base64");
  } catch {
    throw new Error("file-drop.stage: data is not base64");
  }
  if (bytes.byteLength === 0) throw new Error("file-drop.stage: empty file");
  if (bytes.byteLength > options.maxStageBytes) {
    throw new Error(`file-drop.stage: file exceeds ${String(options.maxStageBytes)} bytes`);
  }
  const name2 = safeDroppedName(typeof payload.name === "string" ? payload.name : "dropped.bin");
  const dest = join(options.stageDir, `${randomUUID()}-${name2}`);
  await mkdir(options.stageDir, { recursive: true });
  await writeFile(dest, bytes);
  return { path: dest };
}
function apply(ctx, config = {}) {
  const maxStageBytes = config.maxStageBytes ?? DEFAULT_MAX_STAGE_BYTES;
  const stageDir = config.stageDir ?? defaultStageDir();
  ctx.inject(["connection"], (connectionCtx) => {
    connectionCtx.connection.rpc.handle(CHANNEL, async (endpoint, payload) => {
      try {
        if (endpoint !== "stage") {
          return { ok: false, error: { code: "NOT_FOUND", message: "unknown file-drop endpoint" } };
        }
        const value = await stageDroppedFile(payload, { maxStageBytes, stageDir });
        return { ok: true, value };
      } catch (error) {
        return {
          ok: false,
          error: { code: "INTERNAL", message: error instanceof Error ? error.message : String(error) }
        };
      }
    }, { authority: "loopback" });
  });
}
export {
  CHANNEL,
  apply,
  defaultStageDir,
  name,
  stageDroppedFile
};
