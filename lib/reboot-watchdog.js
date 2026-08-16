// src/host/reboot-watchdog.ts
import { spawn } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
async function waitWhile(check, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!await check()) return true;
    await sleep(200);
  }
  return !await check();
}
async function reachable(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(500) });
    return true;
  } catch {
    return false;
  }
}
async function main() {
  const specPath = process.argv[2];
  if (specPath === void 0) return 1;
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const parentGone = await waitWhile(() => alive(spec.parentPid), spec.parentTimeoutMs);
  if (!parentGone) return 1;
  if (spec.healthUrl !== void 0) {
    await waitWhile(() => reachable(spec.healthUrl), 5e3);
  }
  const child = spawn(spec.execPath, [...spec.execArgv, ...spec.argv], {
    cwd: spec.cwd,
    env: spec.env,
    detached: true,
    stdio: "ignore",
    windowsHide: false
  });
  if (child.pid === void 0) return 1;
  child.unref();
  const up = await waitWhile(async () => {
    if (!alive(child.pid)) return true;
    if (spec.healthUrl === void 0) return false;
    return !await reachable(spec.healthUrl);
  }, spec.childTimeoutMs);
  try {
    unlinkSync(specPath);
  } catch {
  }
  return up && alive(child.pid) ? 0 : 1;
}
void main().then((code) => {
  process.exit(code);
}, () => {
  process.exit(1);
});
