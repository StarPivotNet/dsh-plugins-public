import { homedir } from 'node:os';
import { join } from 'node:path';
import { readColumnsDocument, writeColumnsDocument } from "./columns-store.js";
/** Host half: persist column overrides and serve them to every browser. */
export const name = '@starpivot/dsh-kanban';
export const inject = [];
/** Same-origin route both halves use. */
export const COLUMNS_ROUTE = '/plugins/@starpivot/dsh-kanban/columns';
const WEB_SERVER_KEYS = ['webServer', 'httpServer'];
function resolveHome(ctx) {
    const fromCtx = ctx.get('dshHomePath');
    if (typeof fromCtx === 'string' && fromCtx !== '')
        return fromCtx;
    return process.env.DSH_HOME ?? join(homedir(), '.dsh');
}
function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
    });
    res.end(payload);
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > 1_000_000) {
                reject(new Error('payload too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => { resolve(Buffer.concat(chunks).toString('utf8')); });
        req.on('error', reject);
    });
}
/** Register the columns file + HTTP surface when a web server appears. */
export function apply(ctx) {
    const path = join(resolveHome(ctx), 'kanban-columns.json');
    let webRegistered = false;
    const registerWebSurface = () => {
        if (webRegistered)
            return;
        const webServer = (ctx.get(WEB_SERVER_KEYS[0]) ?? ctx.get(WEB_SERVER_KEYS[1]));
        if (webServer === undefined)
            return;
        webRegistered = true;
        ctx.effect(() => webServer.register({
            kind: 'exact',
            path: COLUMNS_ROUTE,
            handler: async (req, res) => {
                const method = req.method ?? 'GET';
                if (method === 'GET' || method === 'HEAD') {
                    try {
                        const document = await readColumnsDocument(path);
                        sendJson(res, 200, document);
                    }
                    catch (error) {
                        ctx.logger.warn(`kanban: failed to read columns: ${String(error)}`);
                        sendJson(res, 500, { error: 'read failed' });
                    }
                    return;
                }
                if (method === 'PUT') {
                    let raw;
                    try {
                        raw = await readBody(req);
                    }
                    catch {
                        sendJson(res, 413, { error: 'payload too large' });
                        return;
                    }
                    let parsed;
                    try {
                        parsed = JSON.parse(raw);
                    }
                    catch {
                        sendJson(res, 400, { error: 'invalid json' });
                        return;
                    }
                    try {
                        const document = await writeColumnsDocument(path, parsed.columns);
                        sendJson(res, 200, document);
                    }
                    catch (error) {
                        ctx.logger.warn(`kanban: failed to write columns: ${String(error)}`);
                        sendJson(res, 500, { error: 'write failed' });
                    }
                    return;
                }
                res.writeHead(405, { allow: 'GET, HEAD, PUT' });
                res.end();
            },
        }), 'kanban: columns route');
    };
    registerWebSurface();
    ctx.on('internal/service', (serviceName) => {
        if (WEB_SERVER_KEYS.includes(serviceName)) {
            registerWebSurface();
        }
    });
}
