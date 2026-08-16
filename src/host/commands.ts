/** Register /reload, /update, and /reboot on the Host command registry. */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import {
  readProfileManifest,
  reconcileProfilePlugins,
  runProfilePnpm,
} from '@deepseek-ai/dsh-app-boot'
import { matchReloadTarget, reloadClientPlugins, reloadHostEntry, type ReloadableEntry } from './reload.ts'
import { resolveUpdateTarget } from './update.ts'
import { buildRebootSpec, rebootBlocked, startWatchdog, writeRebootSpec } from './reboot.ts'

export function registerMarketplaceCommands(ctx: Context, options: {
  requireProfile: () => { dir: string; installAnchor: string }
  webPort: () => number | undefined
  pinAutoReloadOff: () => void
  exitProcess: () => void
}): void {
  ctx.commands.register({
    name: 'reload',
    description: 'Reload plugins without restarting dsh. Omit the name to reload all.',
    input: { hint: '[plugin name]' },
    handler: invocation => handleReload(ctx, invocation.rawInput),
  })
  ctx.commands.register({
    name: 'update',
    description: 'Update installed profile plugins. Does not reload.',
    input: { hint: '[plugin name]' },
    handler: invocation => handleUpdate(options.requireProfile(), invocation.rawInput),
  })
  ctx.commands.register({
    name: 'reboot',
    description: 'Restart the dsh process through a watchdog.',
    handler: async () => {
      options.pinAutoReloadOff()
      const blocked = rebootBlocked()
      if (blocked !== undefined) return { kind: 'error', text: blocked }
      const spec = buildRebootSpec({ port: options.webPort() })
      const specPath = writeRebootSpec(spec)
      const watchdogPath = join(dirname(fileURLToPath(import.meta.url)), 'reboot-watchdog.js')
      const started = await startWatchdog(watchdogPath, specPath)
      if (!started.ok) return { kind: 'error', text: started.message }
      setTimeout(() => { options.exitProcess() }, 0)
      return { kind: 'success', text: 'Watchdog is ready. Exiting so dsh can restart…' }
    },
  })
}

async function handleReload(ctx: Context, rawInput: string): Promise<{ kind: 'success' | 'error'; text: string }> {
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
    const hint = matched.suggestions.length > 0 ? ` Did you mean: ${matched.suggestions.join(', ')}` : ''
    return { kind: 'error', text: `No plugin matches ${JSON.stringify(matched.query)}.${hint}` }
  }
  if (matched.kind === 'ambiguous') {
    return {
      kind: 'error',
      text: `Several plugins match ${JSON.stringify(matched.query)}: ${matched.matches.map(entry => entry.id).join(', ')}`,
    }
  }
  const selected = matched.kind === 'one'
    ? entries.filter(entry => entry.id === matched.entry.id)
    : entries.filter(entry => entry.enabled && entry.id !== 'plugin-marketplace')
  const failures: string[] = []
  let ok = 0
  for (const entry of selected) {
    const result = await reloadHostEntry(entry)
    if (result.ok) ok += 1
    else failures.push(`${entry.id}: ${result.message}`)
  }
  const port = (ctx.get('webServer') as { port?: number } | undefined)?.port
  const client = await reloadClientPlugins(port)
  const summary = `Reloaded ${String(ok)} host plugin(s). ${client}`
  if (failures.length === 0) return { kind: 'success', text: summary }
  return { kind: 'error', text: `${summary} Failed: ${failures.join('; ')}` }
}

function handleUpdate(
  profile: { dir: string; installAnchor: string },
  rawInput: string,
): { kind: 'success' | 'error'; text: string } {
  const manifest = readProfileManifest('plugin-marketplace', profile.dir)
  const dependencies = Object.keys(manifest.dependencies ?? {})
  const matched = resolveUpdateTarget(dependencies, rawInput)
  if (matched.kind === 'none') {
    return { kind: 'error', text: `${JSON.stringify(matched.query)} is not a profile dependency and cannot be updated.` }
  }
  if (matched.kind === 'ambiguous') {
    return { kind: 'error', text: `Several dependencies match: ${matched.matches.join(', ')}` }
  }
  const args = matched.kind === 'all' ? ['update'] : ['update', matched.name]
  const before = readProfileManifest('plugin-marketplace', profile.dir)
  const result = runProfilePnpm({ profileDir: profile.dir, args, stdio: 'pipe' })
  if (result.missingPnpm) return { kind: 'error', text: 'pnpm is not on PATH; install pnpm to update plugins.' }
  if (result.exitCode !== 0) {
    return { kind: 'error', text: result.stderr.trim() || result.stdout.trim() || `pnpm exited ${String(result.exitCode)}` }
  }
  reconcileProfilePlugins({
    binName: 'plugin-marketplace',
    installAnchor: profile.installAnchor,
    profileDir: profile.dir,
    before,
  })
  return {
    kind: 'success',
    text: 'Updated. Run /reload to load the new code, or /reboot to restart the process.',
  }
}
