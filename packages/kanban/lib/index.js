import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
/** Manual placements the live session state does not already force. */
const COLUMN_IDS = [
	"inbox",
	"ready",
	"running",
	"blocked",
	"done"
];
const EMPTY = {
	schemaVersion: 1,
	columns: {}
};
/**
* Keep only known column ids. Unknown keys are dropped so a corrupt file
* cannot strand the board.
*/
function sanitizeColumns(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
	const next = {};
	for (const [sessionId, column] of Object.entries(value)) {
		if (sessionId === "") continue;
		if (COLUMN_IDS.includes(column)) next[sessionId] = column;
	}
	return next;
}
/**
* Read the host document. A missing file is an empty board, not an error.
* @param path - absolute JSON path.
*/
async function readColumnsDocument(path) {
	let raw;
	try {
		raw = await readFile(path, "utf8");
	} catch (error) {
		if (error.code === "ENOENT") return {
			...EMPTY,
			columns: {}
		};
		throw error;
	}
	try {
		return {
			schemaVersion: 1,
			columns: sanitizeColumns(JSON.parse(raw).columns)
		};
	} catch {
		return {
			...EMPTY,
			columns: {}
		};
	}
}
/**
* Atomically replace the host document.
* @param path - absolute JSON path.
* @param columns - sanitized overrides to persist.
*/
async function writeColumnsDocument(path, columns) {
	const document = {
		schemaVersion: 1,
		columns: sanitizeColumns(columns)
	};
	await mkdir(dirname(path), { recursive: true });
	const tmp = `${path}.tmp`;
	await writeFile(tmp, `${JSON.stringify(document, null, 2)}\n`, "utf8");
	await rename(tmp, path);
	return document;
}
//#endregion
//#region lib/types/index.js
/** Host half: persist column overrides and serve them to every browser. */
const name = "@starpivot/dsh-kanban";
const inject = [];
/** Same-origin route both halves use. */
const COLUMNS_ROUTE = "/plugins/@starpivot/dsh-kanban/columns";
const WEB_SERVER_KEYS = ["webServer", "httpServer"];
function resolveHome(ctx) {
	const fromCtx = ctx.get("dshHomePath");
	if (typeof fromCtx === "string" && fromCtx !== "") return fromCtx;
	return process.env.DSH_HOME ?? join(homedir(), ".dsh");
}
function sendJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(payload);
}
function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > 1e6) {
				reject(/* @__PURE__ */ new Error("payload too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			resolve(Buffer.concat(chunks).toString("utf8"));
		});
		req.on("error", reject);
	});
}
/** Register the columns file + HTTP surface when a web server appears. */
function apply(ctx) {
	const path = join(resolveHome(ctx), "kanban-columns.json");
	let webRegistered = false;
	const registerWebSurface = () => {
		if (webRegistered) return;
		const webServer = ctx.get(WEB_SERVER_KEYS[0]) ?? ctx.get(WEB_SERVER_KEYS[1]);
		if (webServer === void 0) return;
		webRegistered = true;
		ctx.effect(() => webServer.register({
			kind: "exact",
			path: COLUMNS_ROUTE,
			handler: async (req, res) => {
				const method = req.method ?? "GET";
				if (method === "GET" || method === "HEAD") {
					try {
						sendJson(res, 200, await readColumnsDocument(path));
					} catch (error) {
						ctx.logger.warn(`kanban: failed to read columns: ${String(error)}`);
						sendJson(res, 500, { error: "read failed" });
					}
					return;
				}
				if (method === "PUT") {
					let raw;
					try {
						raw = await readBody(req);
					} catch {
						sendJson(res, 413, { error: "payload too large" });
						return;
					}
					let parsed;
					try {
						parsed = JSON.parse(raw);
					} catch {
						sendJson(res, 400, { error: "invalid json" });
						return;
					}
					try {
						sendJson(res, 200, await writeColumnsDocument(path, parsed.columns));
					} catch (error) {
						ctx.logger.warn(`kanban: failed to write columns: ${String(error)}`);
						sendJson(res, 500, { error: "write failed" });
					}
					return;
				}
				res.writeHead(405, { allow: "GET, HEAD, PUT" });
				res.end();
			}
		}), "kanban: columns route");
	};
	registerWebSurface();
	ctx.on("internal/service", (serviceName) => {
		if (WEB_SERVER_KEYS.includes(serviceName)) registerWebSurface();
	});
}
//#endregion
export { COLUMNS_ROUTE, apply, inject, name };
