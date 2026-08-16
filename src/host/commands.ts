/** Register /reload, /update, and /reboot on the Host command registry. */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import {
  readProfileManifest,
  reconcileProfilePlugins,
  runProfilePnpm,
} from '@deepseek-ai/dsh-app-boot'
import {
  matchReloadTarget, reloadHostEntry, requestBrowserReload, selectReloadEntries,
  type ReloadableEntry,
} from './reload.ts'
import { resolveUpdateTarget } from './update.ts'
import { buildRebootSpec, rebootBlocked, startWatchdog, writeRebootSpec } from './reboot.ts'

export function registerMarketplaceCommands(ctx: Context, options: {
  requireProfile: () => { dir: string; installAnchor: string }
  webPort: () => number | undefined
  pinAutoReloadOff: () => void
  exitProcess: () => void
  settingsNs: unknown
}): void {
  ctx.commands.register({
    name: 'reload',
    description: '重载插件。不写名字则重载除连接骨架外的全部插件。',
    input: { hint: '[插件名字]' },
    handler: invocation => handleReload(ctx, options.settingsNs, invocation.rawInput),
  })
  ctx.commands.register({
    name: 'update',
    description: '更新已安装的 profile 插件，不会热重载。',
    input: { hint: '[插件名字]' },
    handler: invocation => handleUpdate(options.requireProfile(), invocation.rawInput),
  })
  ctx.commands.register({
    name: 'reboot',
    description: '通过看门狗重启整个 dsh 进程。',
    handler: async () => {
      options.pinAutoReloadOff()
      const blocked = rebootBlocked()
      if (blocked !== undefined) return { kind: 'error', text: blocked }
      const spec = buildRebootSpec({ port: options.webPort() })
      const specPath = writeRebootSpec(spec)
      const watchdogPath = join(dirname(fileURLToPath(import.meta.url)), 'reboot-watchdog.js')
      const started = await startWatchdog(watchdogPath, specPath)
      if (!started.ok) return { kind: 'error', text: started.message }
      // Wait for command/done to reach the browser before killing the process.
      // ctx.appExit only disposes the tree and does not exit the web process.
      setTimeout(() => { process.exit(0) }, 800)
      return { kind: 'success', text: '看门狗已就绪，800ms 后退出并由看门狗拉起新进程…' }
    },
  })
}

async function handleReload(
  ctx: Context,
  settingsNs: unknown,
  rawInput: string,
): Promise<{ kind: 'success' | 'error'; text: string }> {
  const entries = [...ctx.loader.entries()]
    .filter(entry => !entry.options.group)
    .map((entry): ReloadableEntry => ({
      id: entry.id,
      moduleName: String(entry.options.name ?? ''),
      enabled: !entry.disabled,
      get fiber() { return entry.fiber },
      set fiber(value) { entry.fiber = value },
      refresh: () => entry.refresh(),
    }))
  const matched = matchReloadTarget(entries, rawInput)
  if (matched.kind === 'none') {
    const hint = matched.suggestions.length > 0 ? ` 是不是指：${matched.suggestions.join('、')}` : ''
    return { kind: 'error', text: `没有匹配 ${JSON.stringify(matched.query)} 的插件。${hint}` }
  }
  if (matched.kind === 'ambiguous') {
    return {
      kind: 'error',
      text: `有多个插件匹配 ${JSON.stringify(matched.query)}：${matched.matches.map(entry => entry.id).join('、')}`,
    }
  }
  const picked = selectReloadEntries(entries, matched)
  if (!picked.ok) return { kind: 'error', text: picked.message }
  if (picked.selected.length === 0) {
    return { kind: 'success', text: '没有可热重载的 Host 插件。连接骨架请用 /reboot。' }
  }
  const names = picked.selected.map(entry => entry.id)
  const skipped = picked.skipped > 0 ? `跳过 ${String(picked.skipped)} 个连接骨架。` : ''
  setTimeout(() => {
    void runDeferredReload(ctx, settingsNs, names)
  }, 800)
  return {
    kind: 'success',
    text: `将在 800ms 后重载 ${String(names.length)} 个插件：${names.slice(0, 8).join('、')}${names.length > 8 ? '…' : ''}。${skipped}连接骨架请用 /reboot。`,
  }
}

async function runDeferredReload(
  ctx: Context,
  settingsNs: unknown,
  entryIds: readonly string[],
): Promise<void> {
  const registry = (ctx as { registry?: { delete(callback: unknown): void } }).registry
  const wanted = new Set(entryIds)
  const selected = [...ctx.loader.entries()]
    .filter(entry => !entry.options.group && wanted.has(entry.id))
    .map((entry): ReloadableEntry => ({
      id: entry.id,
      moduleName: String(entry.options.name ?? ''),
      enabled: !entry.disabled,
      get fiber() { return entry.fiber },
      set fiber(value) { entry.fiber = value },
      refresh: () => entry.refresh(),
    }))
  for (const entry of selected) {
    await reloadHostEntry(entry, registry)
  }
  await requestBrowserReload(
    ctx.get('settings') as {
      get?: (ns: unknown) => { reloadNonce?: number }
      update?: (ns: unknown, patch: object) => Promise<unknown>
    } | undefined,
    settingsNs,
  )
}

function handleUpdate(
  profile: { dir: string; installAnchor: string },
  rawInput: string,
): { kind: 'success' | 'error'; text: string } {
  const manifest = readProfileManifest('plugin-marketplace', profile.dir)
  const dependencies = Object.keys(manifest.dependencies ?? {})
  const matched = resolveUpdateTarget(dependencies, rawInput)
  if (matched.kind === 'none') {
    return { kind: 'error', text: `${JSON.stringify(matched.query)} 不是 profile 依赖，不能更新。` }
  }
  if (matched.kind === 'ambiguous') {
    return { kind: 'error', text: `有多个依赖匹配：${matched.matches.join('、')}` }
  }
  const args = matched.kind === 'all' ? ['update'] : ['update', matched.name]
  const before = readProfileManifest('plugin-marketplace', profile.dir)
  const result = runProfilePnpm({ profileDir: profile.dir, args, stdio: 'pipe' })
  if (result.missingPnpm) return { kind: 'error', text: '找不到 pnpm，请先安装 pnpm 再更新插件。' }
  if (result.exitCode !== 0) {
    return { kind: 'error', text: result.stderr.trim() || result.stdout.trim() || `pnpm 退出码 ${String(result.exitCode)}` }
  }
  reconcileProfilePlugins({
    binName: 'plugin-marketplace',
    installAnchor: profile.installAnchor,
    profileDir: profile.dir,
    before,
  })
  return {
    kind: 'success',
    text: '已更新。要加载新代码请运行 /reload；要重启进程请运行 /reboot。',
  }
}
