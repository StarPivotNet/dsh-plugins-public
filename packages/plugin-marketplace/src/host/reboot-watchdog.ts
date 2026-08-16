/** Standalone reboot watchdog. No Cordis imports. */

import { spawn } from 'node:child_process'
import { readFileSync, unlinkSync } from 'node:fs'
import type { RebootSpec } from './reboot.ts'

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function waitWhile(check: () => Promise<boolean> | boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!(await check())) return true
    await sleep(200)
  }
  return !(await check())
}

async function reachable(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(500) })
    return true
  } catch {
    return false
  }
}

async function main(): Promise<number> {
  const specPath = process.argv[2]
  if (specPath === undefined) return 1
  const spec = JSON.parse(readFileSync(specPath, 'utf8')) as RebootSpec
  const parentGone = await waitWhile(() => alive(spec.parentPid), spec.parentTimeoutMs)
  if (!parentGone) return 1
  if (spec.healthUrl !== undefined) {
    await waitWhile(() => reachable(spec.healthUrl!), 5_000)
  }
  const child = spawn(spec.execPath, [...spec.execArgv, ...spec.argv], {
    cwd: spec.cwd,
    env: spec.env,
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  })
  if (child.pid === undefined) return 1
  child.unref()
  const up = await waitWhile(async () => {
    if (!alive(child.pid!)) return true
    if (spec.healthUrl === undefined) return false
    return !(await reachable(spec.healthUrl))
  }, spec.childTimeoutMs)
  try { unlinkSync(specPath) } catch { /* spec already gone */ }
  return up && alive(child.pid) ? 0 : 1
}

void main().then((code) => { process.exit(code) }, () => { process.exit(1) })
